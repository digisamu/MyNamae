"use client";

import { ContactShadows } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { forwardRef, useEffect, useEffectEvent, useImperativeHandle, useMemo, useRef, useState } from "react";
import {
  CanvasTexture,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  Quaternion,
  RingGeometry,
  SRGBColorSpace,
  Vector3,
  type Camera,
  type PerspectiveCamera,
  type Texture,
} from "three";
import { CULTURE_THEME } from "@/components/culture-selector/cultureTheme";
import {
  createDieMotion,
  flightProgress,
  impactsBetween,
  samplePose,
  type DieMotion,
  type Pose,
  type ThrowParams,
  type Timeline,
} from "./choreography";
import { createFaceTexture, loadFaceFonts, resolveFaceFonts } from "./faceTexture";
import { FACE_NORMALS, faceUpQuaternion, topFace } from "./orientation";
import { createRoundedBoxGeometry } from "./roundedBox";
import type { DiceViewProps, SceneDie, ScreenPoint } from "./types";

const DIE_SIZE = 1;
const REST_Y = DIE_SIZE / 2;
const RIPPLE_POOL = 6;
const Z_AXIS = new Vector3(0, 0, 1);

function restPositions(count: number): number[] {
  return count === 3 ? [-1.55, 0, 1.55] : [-0.85, 0.85];
}

let highlightTexture: Texture | null = null;
/** Thin vermilion frame laid over the face that landed on top (shared by every die). */
function getHighlightTexture(): Texture {
  if (highlightTexture) return highlightTexture;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  ctx.strokeStyle = "#d94b3d";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.roundRect(14, 14, 228, 228, 34);
  ctx.stroke();
  highlightTexture = new CanvasTexture(canvas);
  highlightTexture.colorSpace = SRGBColorSpace;
  return highlightTexture;
}

interface RipplesHandle {
  trigger(x: number, z: number, strength: number): void;
}

/** A small pool of ink-dust rings reused for every impact; nothing is allocated per frame. */
const Ripples = forwardRef<RipplesHandle>(function Ripples(_, ref) {
  const invalidate = useThree((s) => s.invalidate);
  const geometry = useMemo(() => new RingGeometry(0.46, 0.5, 48), []);
  const rings = useRef<(Mesh | null)[]>([]);
  const state = useRef(Array.from({ length: RIPPLE_POOL }, () => ({ start: -1, strength: 0 })));
  const next = useRef(0);

  useImperativeHandle(ref, () => ({
    trigger(x, z, strength) {
      const i = next.current++ % RIPPLE_POOL;
      const ring = rings.current[i];
      if (!ring) return;
      ring.position.set(x, 0.004, z);
      state.current[i] = { start: performance.now(), strength };
      invalidate();
    },
  }));

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame(() => {
    let active = false;
    const now = performance.now();
    state.current.forEach((s, i) => {
      const ring = rings.current[i];
      if (!ring || s.start < 0) return;
      const k = (now - s.start) / 650;
      const material = ring.material as MeshBasicMaterial;
      if (k >= 1) {
        s.start = -1;
        ring.visible = false;
        return;
      }
      active = true;
      ring.visible = true;
      const scale = 0.7 + k * (0.9 + s.strength);
      ring.scale.set(scale, scale, scale);
      material.opacity = (1 - k) ** 2 * (0.12 + 0.22 * s.strength);
    });
    if (active) invalidate();
  });

  return (
    <>
      {Array.from({ length: RIPPLE_POOL }, (_, i) => (
        <mesh
          key={i}
          ref={(m) => {
            rings.current[i] = m;
          }}
          geometry={geometry}
          rotation={[-Math.PI / 2, 0, 0]}
          visible={false}
        >
          <meshBasicMaterial color="#3a2f28" transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
    </>
  );
});

interface DieProps {
  die: SceneDie;
  index: number;
  count: number;
  x: number;
  rollId: number | null;
  sceneKey: string;
  startedAt: number;
  timeline: Timeline | null;
  throwParams: ThrowParams;
  fastForwarded: boolean;
  charging: boolean;
  reducedMotion: boolean;
  onSettle: (sceneKey: string, index: number, face: number, point: ScreenPoint) => void;
  onImpact: (strength: number, x: number, z: number) => void;
}

/**
 * Which face is up, and a screen anchor (fractions of the canvas) just above the die's back edge,
 * so overlays such as the lock seal never cover the face label.
 */
function settleReport(g: Group, m: Mesh, camera: PerspectiveCamera | Camera, scratch: Vector3): [number, ScreenPoint] {
  const v = scratch.copy(g.position);
  v.y += 0.5;
  v.z -= 0.62;
  v.project(camera);
  return [topFace(m.quaternion), { x: (v.x + 1) / 2, y: (1 - v.y) / 2 }];
}

interface RollState {
  rollId: number;
  motion: DieMotion;
  fromPosition: Vector3;
  fromQuaternion: Quaternion;
  target: Quaternion;
  progress: number;
}

function Die(props: DieProps) {
  const { die, index, count, x, rollId, sceneKey, timeline, throwParams, reducedMotion } = props;
  const group = useRef<Group>(null);
  const mesh = useRef<Mesh>(null);
  const highlight = useRef<Mesh>(null);
  const roll = useRef<RollState | null>(null);
  const settledRoll = useRef<number | null>(null);
  const rattleBase = useRef<Quaternion | null>(null);
  const pose = useRef<Pose>({ position: new Vector3(), quaternion: new Quaternion(), squash: 1 });
  const rattle = useRef(new Quaternion());
  const projected = useRef(new Vector3());
  const rest = useMemo(() => new Vector3(x, REST_Y, 0), [x]);
  const invalidate = useThree((s) => s.invalidate);
  const camera = useThree((s) => s.camera);
  const geometry = useMemo(() => createRoundedBoxGeometry(DIE_SIZE, 0.15, 6), []);
  const accent = CULTURE_THEME[die.culture].accent;
  const materials = useMemo(
    () =>
      Array.from(
        { length: 6 },
        () => new MeshPhysicalMaterial({ color: "#ffffff", roughness: 0.42, metalness: 0, clearcoat: 0.35, clearcoatRoughness: 0.4 }),
      ),
    [],
  );
  const highlightMaterial = useRef<MeshBasicMaterial>(null);
  const highlightMap = useMemo(() => getHighlightTexture(), []);

  // Paint labels once fonts are ready. Old textures stay visible until the new ones exist (no flash).
  const paint = useEffectEvent(async (isCancelled: () => boolean) => {
    const fonts = resolveFaceFonts();
    await loadFaceFonts(fonts, die.faces);
    if (isCancelled()) return;
    die.faces.forEach((label, i) => {
      const material = materials[i]!;
      const previous = material.map;
      material.map = createFaceTexture(label, accent, fonts);
      material.needsUpdate = true;
      previous?.dispose();
    });
    invalidate();
  });
  useEffect(() => {
    let cancelled = false;
    void paint(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [die.facesKey, accent]);

  useEffect(
    () => () => {
      geometry.dispose();
      materials.forEach((m) => {
        m.map?.dispose();
        m.dispose();
      });
    },
    [geometry, materials],
  );

  const highlightTransform = useMemo(() => {
    const normal = FACE_NORMALS[die.targetFace]!;
    return {
      position: normal.clone().multiplyScalar(0.503),
      quaternion: new Quaternion().setFromUnitVectors(Z_AXIS, normal),
    };
  }, [die.targetFace]);

  const reportSettled = useEffectEvent(() => {
    const g = group.current;
    const m = mesh.current;
    if (!g || !m) return;
    props.onSettle(sceneKey, index, ...settleReport(g, m, camera, projected.current));
  });

  // Start a roll, keep a locked die where it is, or snap to the idle preview orientation.
  useEffect(() => {
    const g = group.current;
    const m = mesh.current;
    if (!g || !m) return;
    if (rollId === null || !timeline) {
      roll.current = null;
      if (!die.locked) {
        g.position.copy(rest);
        g.scale.set(1, 1, 1);
        m.quaternion.copy(faceUpQuaternion(die.targetFace, (index - 0.5) * 0.12));
      }
      settledRoll.current = null;
      reportSettled();
      invalidate();
      return;
    }
    if (die.locked) {
      roll.current = null;
      settledRoll.current = rollId;
      reportSettled();
      invalidate();
      return;
    }
    settledRoll.current = null;
    roll.current = {
      rollId,
      motion: createDieMotion(index, count, throwParams, reducedMotion, Math.random),
      fromPosition: g.position.clone(),
      fromQuaternion: (rattleBase.current ?? m.quaternion).clone(),
      target: faceUpQuaternion(die.targetFace, (Math.random() - 0.5) * 0.35),
      progress: -1,
    };
    rattleBase.current = null;
    invalidate();
  }, [rollId, sceneKey, rest, die.targetFace, die.locked, index, count, timeline, throwParams, reducedMotion, invalidate]);

  useEffect(() => {
    invalidate();
  }, [props.charging, props.fastForwarded, invalidate]);

  useFrame(() => {
    const g = group.current;
    const m = mesh.current;
    if (!g || !m) return;
    const r = roll.current;

    if (r && timeline) {
      const t = props.fastForwarded ? Infinity : performance.now() - props.startedAt;
      const out = pose.current;
      const phase = samplePose(out, {
        motion: r.motion,
        timeline,
        index,
        t,
        rest,
        fromPosition: r.fromPosition,
        fromQuaternion: r.fromQuaternion,
        target: r.target,
      });
      g.position.copy(out.position);
      const spread = 1 + (1 - out.squash) * 0.6;
      g.scale.set(spread, out.squash, spread);
      m.quaternion.copy(out.quaternion);

      const progress = flightProgress(timeline, index, t);
      if (!props.fastForwarded && !timeline.reduced) {
        for (const impact of impactsBetween(r.progress, progress)) {
          props.onImpact(impact.strength, g.position.x, g.position.z);
        }
      }
      r.progress = progress;

      if (phase === "settled") {
        roll.current = null;
        settledRoll.current = r.rollId;
        props.onSettle(sceneKey, index, ...settleReport(g, m, camera, projected.current));
      }
      invalidate();
    } else if (props.charging && !die.locked) {
      // Holding the roll button: the dice rattle gently in place.
      rattleBase.current ??= m.quaternion.clone();
      const time = performance.now() / 1000;
      rattle.current
        .set(
          Math.sin(time * 31 + index * 1.7) * 0.025,
          Math.sin(time * 23 + index) * 0.03,
          Math.sin(time * 37 + index * 2.3) * 0.025,
          1,
        )
        .normalize();
      m.quaternion.copy(rattleBase.current).premultiply(rattle.current);
      g.position.y = REST_Y + Math.abs(Math.sin(time * 40 + index)) * 0.025;
      invalidate();
    } else if (rattleBase.current) {
      m.quaternion.copy(rattleBase.current);
      g.position.y = REST_Y;
      rattleBase.current = null;
      invalidate();
    }

    // Soft frame on the upward face once this die has settled.
    const h = highlight.current;
    const hm = highlightMaterial.current;
    if (h && hm) {
      const target = settledRoll.current !== null && settledRoll.current === rollId ? 0.85 : 0;
      const next = reducedMotion ? target : hm.opacity + (target - hm.opacity) * 0.18;
      if (Math.abs(target - next) > 0.004) {
        hm.opacity = next;
        invalidate();
      } else {
        hm.opacity = target;
      }
      h.visible = hm.opacity > 0.01;
    }
  });

  return (
    <group ref={group} position={[x, REST_Y, 0]}>
      <mesh ref={mesh} geometry={geometry} material={materials} castShadow>
        <mesh
          ref={highlight}
          position={highlightTransform.position}
          quaternion={highlightTransform.quaternion}
          visible={false}
        >
          <planeGeometry args={[0.9, 0.9]} />
          <meshBasicMaterial ref={highlightMaterial} map={highlightMap} transparent opacity={0} depthWrite={false} />
        </mesh>
      </mesh>
    </group>
  );
}

/** Keeps every die in frame for any aspect ratio, and eases in slightly once the dice have settled. */
function CameraRig({ count, focused, reducedMotion }: { count: number; focused: boolean; reducedMotion: boolean }) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const width = useThree((s) => s.size.width);
  const height = useThree((s) => s.size.height);
  const invalidate = useThree((s) => s.invalidate);
  const base = useRef(new Vector3());
  const zoom = useRef(1);

  useEffect(() => {
    const aspect = width / Math.max(1, height);
    const halfWidth = count === 3 ? 2.7 : 1.95;
    const vFov = (camera.fov * Math.PI) / 180;
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
    const distance = Math.max(6.4, (halfWidth / Math.tan(hFov / 2)) * 1.12);
    base.current.set(0, 0.84, 0.55).normalize().multiplyScalar(distance);
    camera.position.copy(base.current).multiplyScalar(zoom.current);
    camera.lookAt(0, 0.35, 0);
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, width, height, count, invalidate]);

  useEffect(() => {
    invalidate();
  }, [focused, invalidate]);

  useFrame(() => {
    const target = focused && !reducedMotion ? 0.95 : 1;
    if (Math.abs(zoom.current - target) < 0.0005) return;
    zoom.current += (target - zoom.current) * 0.08;
    camera.position.copy(base.current).multiplyScalar(zoom.current);
    camera.lookAt(0, 0.35, 0);
    invalidate();
  });

  return null;
}

/** Re-renders once the tab becomes visible again so interrupted rolls snap to their result. */
function VisibilityInvalidator() {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") invalidate();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [invalidate]);
  return null;
}

export default function DiceScene(props: DiceViewProps) {
  const { dice, rollId, sceneKey, onSettled, onImpact, reducedMotion } = props;
  const settled = useRef<{ key: string; faces: (number | undefined)[]; points: ScreenPoint[] }>({
    key: "",
    faces: [],
    points: [],
  });
  const ripples = useRef<RipplesHandle>(null);
  const [focusedKey, setFocusedKey] = useState<string | null>(null);
  const xs = restPositions(dice.length);

  const onSettle = (key: string, index: number, face: number, point: ScreenPoint) => {
    if (settled.current.key !== key) settled.current = { key, faces: [], points: [] };
    settled.current.faces[index] = face;
    settled.current.points[index] = point;
    const faces = settled.current.faces.slice(0, dice.length);
    if (faces.length === dice.length && faces.every((f) => f !== undefined)) {
      if (rollId !== null) setFocusedKey(key);
      onSettled(key, faces as number[], settled.current.points.slice(0, dice.length));
    }
  };

  const handleImpact = (strength: number, x: number, z: number) => {
    ripples.current?.trigger(x, z, strength);
    onImpact?.(strength);
  };

  return (
    <Canvas
      flat
      frameloop="demand"
      dpr={[1, 2]}
      camera={{ fov: 30, near: 0.1, far: 60, position: [0, 6, 5] }}
      gl={{ antialias: true, alpha: true, powerPreference: "default" }}
      className="!absolute inset-0"
    >
      <CameraRig count={dice.length} focused={focusedKey === sceneKey} reducedMotion={reducedMotion} />
      <VisibilityInvalidator />
      <ambientLight intensity={0.55} color="#fffaf3" />
      <hemisphereLight args={["#fffaf2", "#e9e2d6", 1.3]} />
      <directionalLight position={[2.5, 8, 4]} intensity={1.6} color="#fff8ee" />
      <directionalLight position={[-4, 3, -2]} intensity={0.35} color="#f2d9d6" />
      {dice.map((die, i) => (
        <Die
          key={i}
          die={die}
          index={i}
          count={dice.length}
          x={xs[i] ?? 0}
          rollId={rollId}
          sceneKey={sceneKey}
          startedAt={props.startedAt}
          timeline={props.timeline}
          throwParams={props.throwParams}
          fastForwarded={props.fastForwarded}
          charging={props.charging}
          reducedMotion={reducedMotion}
          onSettle={onSettle}
          onImpact={handleImpact}
        />
      ))}
      <Ripples ref={ripples} />
      <ContactShadows position={[0, 0.001, 0]} opacity={0.38} scale={9} blur={2.6} far={3.2} resolution={512} color="#4a3f35" />
    </Canvas>
  );
}

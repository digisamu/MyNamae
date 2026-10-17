"use client";

import { ContactShadows } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useEffectEvent, useMemo, useRef } from "react";
import { MeshPhysicalMaterial, Quaternion, Vector3, type Mesh, type PerspectiveCamera } from "three";
import { CULTURE_THEME } from "@/components/culture-selector/cultureTheme";
import { createFaceTexture, loadFaceFonts, resolveFaceFonts } from "./faceTexture";
import { faceUpQuaternion, topFace } from "./orientation";
import { createRoundedBoxGeometry } from "./roundedBox";
import type { DiceViewProps, SceneDie } from "./types";

const DIE_SIZE = 1;
const REST_Y = DIE_SIZE / 2;
const STAGGER_MS = 90;

function restPositions(count: number): number[] {
  return count === 3 ? [-1.55, 0, 1.55] : [-0.85, 0.85];
}

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

interface RollAnimation {
  from: Quaternion;
  to: Quaternion;
  axis: Vector3;
  spin: number;
  height: number;
  drift: Vector3;
  delay: number;
}

interface DieProps {
  die: SceneDie;
  index: number;
  x: number;
  rollId: number | null;
  startedAt: number;
  duration: number;
  reducedMotion: boolean;
  sceneKey: string;
  onSettle: (sceneKey: string, index: number, face: number) => void;
}

function Die({ die, index, x, rollId, startedAt, duration, reducedMotion, sceneKey, onSettle }: DieProps) {
  const mesh = useRef<Mesh>(null);
  const anim = useRef<RollAnimation | null>(null);
  const invalidate = useThree((s) => s.invalidate);
  const geometry = useMemo(() => createRoundedBoxGeometry(DIE_SIZE, 0.15, 6), []);
  const accent = CULTURE_THEME[die.culture].accent;

  const materials = useMemo(
    () =>
      die.faces.map(
        () =>
          new MeshPhysicalMaterial({ color: "#ffffff", roughness: 0.42, metalness: 0, clearcoat: 0.35, clearcoatRoughness: 0.4 }),
      ),
    [die.faces],
  );

  // Paint labels once fonts are ready; textures are disposed when the faces change.
  useEffect(() => {
    let cancelled = false;
    const fonts = resolveFaceFonts();
    const textures: { dispose(): void }[] = [];
    loadFaceFonts(fonts, die.faces).then(() => {
      if (cancelled) return;
      die.faces.forEach((label, i) => {
        const texture = createFaceTexture(label, accent, fonts);
        textures.push(texture);
        materials[i]!.map = texture;
        materials[i]!.needsUpdate = true;
      });
      invalidate();
    });
    return () => {
      cancelled = true;
      textures.forEach((t) => t.dispose());
      materials.forEach((m) => m.dispose());
    };
  }, [die.faces, accent, materials, invalidate]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  const reportSettled = useEffectEvent((face: number) => onSettle(sceneKey, index, face));

  // Start a roll, or snap to the idle preview orientation.
  useEffect(() => {
    const m = mesh.current;
    if (!m) return;
    if (rollId === null) {
      anim.current = null;
      m.position.set(x, REST_Y, 0);
      m.quaternion.copy(faceUpQuaternion(die.targetFace, (index - 0.5) * 0.12));
      reportSettled(topFace(m.quaternion));
      invalidate();
      return;
    }
    const jitter = (Math.random() - 0.5) * 0.35;
    anim.current = {
      from: m.quaternion.clone(),
      to: faceUpQuaternion(die.targetFace, jitter),
      axis: new Vector3(Math.random() - 0.5, Math.random() * 0.4, Math.random() - 0.5).normalize(),
      spin: reducedMotion ? Math.PI / 2 : Math.PI * (3 + Math.random() * 2),
      height: reducedMotion ? 0 : 1.05 + Math.random() * 0.35,
      drift: reducedMotion ? new Vector3() : new Vector3((Math.random() - 0.5) * 0.7, 0, (Math.random() - 0.5) * 0.5),
      delay: index * STAGGER_MS,
    };
    invalidate();
  }, [rollId, sceneKey, x, die.targetFace, index, reducedMotion, invalidate]);

  useFrame(() => {
    const a = anim.current;
    const m = mesh.current;
    if (!a || !m) return;
    const span = Math.max(1, duration - STAGGER_MS * 2);
    const t = Math.min(1, Math.max(0, (performance.now() - startedAt - a.delay) / span));

    if (t >= 1) {
      m.position.set(x, REST_Y, 0);
      m.quaternion.copy(a.to);
      anim.current = null;
      onSettle(sceneKey, index, topFace(m.quaternion));
      invalidate();
      return;
    }

    // Three decaying hops that touch the floor at t = 1/3, 2/3 and 1.
    const hop = a.height * (1 - t) ** 1.6 * Math.abs(Math.sin(Math.PI * 3 * t));
    const sway = Math.sin(Math.PI * t) * (1 - t);
    m.position.set(x + a.drift.x * sway, REST_Y + hop, a.drift.z * sway);

    // Tumble around a random axis, unwinding exactly onto the target orientation.
    const remaining = a.spin * (1 - easeOutCubic(t));
    const path = new Quaternion().setFromAxisAngle(a.axis, remaining).multiply(a.to);
    const blend = Math.min(1, t / 0.12);
    m.quaternion.copy(blend < 1 ? a.from.clone().slerp(path, blend) : path);
    invalidate();
  });

  return <mesh ref={mesh} geometry={geometry} material={materials} castShadow position={[x, REST_Y, 0]} />;
}

/** Keeps every die in frame for any aspect ratio. */
function CameraRig({ count }: { count: number }) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const width = useThree((s) => s.size.width);
  const height = useThree((s) => s.size.height);
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    const aspect = width / Math.max(1, height);
    const halfWidth = count === 3 ? 2.7 : 1.95;
    const vFov = (camera.fov * Math.PI) / 180;
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
    const distance = Math.max(6.4, (halfWidth / Math.tan(hFov / 2)) * 1.12);
    const dir = new Vector3(0, 0.84, 0.55).normalize();
    camera.position.copy(dir.multiplyScalar(distance));
    camera.lookAt(0, 0.35, 0);
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, width, height, count, invalidate]);

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

export default function DiceScene({ dice, rollId, sceneKey, startedAt, duration, reducedMotion, onSettled }: DiceViewProps) {
  const settled = useRef<{ key: string; faces: (number | undefined)[] }>({ key: "", faces: [] });
  const xs = restPositions(dice.length);

  const onSettle = (key: string, index: number, face: number) => {
    if (settled.current.key !== key) settled.current = { key, faces: [] };
    settled.current.faces[index] = face;
    const faces = settled.current.faces.slice(0, dice.length);
    if (faces.length === dice.length && faces.every((f) => f !== undefined)) {
      onSettled(key, faces as number[]);
    }
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
      <CameraRig count={dice.length} />
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
          x={xs[i] ?? 0}
          rollId={rollId}
          startedAt={startedAt}
          duration={duration}
          reducedMotion={reducedMotion}
          sceneKey={sceneKey}
          onSettle={onSettle}
        />
      ))}
      <ContactShadows position={[0, 0.001, 0]} opacity={0.38} scale={9} blur={2.6} far={3.2} resolution={512} color="#4a3f35" />
    </Canvas>
  );
}

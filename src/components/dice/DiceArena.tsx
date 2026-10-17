"use client";

import { Lock, LockOpen } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useId, useMemo, useRef, useState, useSyncExternalStore, type KeyboardEvent, type PointerEvent } from "react";
import { useMyNamae, type ActiveRoll } from "@/components/app/MyNamaeProvider";
import { CULTURE_THEME } from "@/components/culture-selector/cultureTheme";
import { launchRevealFlight } from "@/components/name-result/revealEffects";
import { defaultRegistry } from "@/data/cultures";
import { formatFaceLabel } from "@/features/formatting/formatName";
import { isCrossCultural } from "@/features/generation/config";
import { previewFaces } from "@/features/generation/generate";
import { playClack } from "@/features/sound/soundEngine";
import { hasWebGL } from "@/lib/webgl";
import type { CultureId } from "@/types/names";
import { BUTTON_THROW, clampPower } from "./choreography";
import { FlatDice } from "./FlatDice";
import { SceneErrorBoundary } from "./SceneErrorBoundary";
import type { DiceViewProps, SceneDie, ScreenPoint } from "./types";

function ArenaLoading() {
  const { t } = useMyNamae();
  return (
    <div className="absolute inset-0 grid place-items-center" role="status">
      <div className="flex flex-col items-center gap-3 text-sm text-muted">
        <span className="flex gap-2" aria-hidden>
          <span className="size-8 animate-pulse rounded-lg border border-line-strong bg-surface" />
          <span className="size-8 animate-pulse rounded-lg border border-line-strong bg-surface [animation-delay:150ms]" />
        </span>
        {t("hero.sceneLoading")}
      </div>
    </div>
  );
}

const DiceScene = dynamic(() => import("./DiceScene"), { ssr: false, loading: () => <ArenaLoading /> });

const noopSubscribe = () => () => {};
const sameDice = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((c, i) => c === b[i]);

/** Minimum flick to count as a throw rather than a tap. */
const THROW_DISTANCE_PX = 40;
const THROW_SPEED = 0.35; // px per ms

interface DieView {
  ids: string[];
  targetFace: number;
  locked: boolean;
}

/**
 * Which faces each die shows: the current roll while it matches the configuration; otherwise dice locked
 * from the last roll keep their faces and the rest show idle preview faces.
 */
function computeView(dice: readonly CultureId[], live: ActiveRoll | null, last: ActiveRoll | null, locks: readonly number[]) {
  if (live) {
    return {
      sceneKey: `roll-${live.id}`,
      dice: live.outcome.dice.map<DieView>((d, i) => ({
        ids: [...d.faces],
        targetFace: d.faceIndex,
        locked: live.lockedIndexes.includes(i),
      })),
    };
  }
  const preview = previewFaces(dice);
  const kept = (i: number) =>
    last && last.outcome.dice.length === dice.length && locks.includes(i) && last.outcome.dice[i]?.culture === dice[i]
      ? last.outcome.dice[i]!
      : null;
  return {
    sceneKey: `preview-${dice.join("-")}-${dice.map((_, i) => (kept(i) ? "L" : "o")).join("")}`,
    dice: dice.map<DieView>((_, i) => {
      const k = kept(i);
      return k ? { ids: [...k.faces], targetFace: k.faceIndex, locked: true } : { ids: preview[i]!, targetFace: 0, locked: false };
    }),
  };
}

export function DiceArena() {
  const { state, activeRoll, reducedMotion, t, cultureName, phase, roll, fastForward, charging, locks, toggleLock } =
    useMyNamae();
  const webgl = useSyncExternalStore(noopSubscribe, hasWebGL, () => true);
  const [sceneFailed, setSceneFailed] = useState(false);
  const [settled, setSettled] = useState<{ key: string; faces: number[]; points: ScreenPoint[] } | null>(null);
  const arenaRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; t: number } | null>(null);
  const suppressClick = useRef(false);
  const flownKey = useRef<string | null>(null);
  const hintId = useId();
  const use3d = webgl && state.preferences.dice3d && !sceneFailed;
  const cross = isCrossCultural(state.dice);

  const live = activeRoll && sameDice(activeRoll.outcome.result.dice, state.dice) ? activeRoll : null;
  const view = useMemo(() => {
    const v = computeView(state.dice, live, activeRoll, locks);
    const dice: SceneDie[] = v.dice.map((d, i) => {
      const faces = d.ids.map((id) => formatFaceLabel(defaultRegistry.componentById.get(id)!, cross));
      return {
        culture: state.dice[i]!,
        faces,
        facesKey: `${cross ? "x" : "n"}:${d.ids.join(",")}`,
        targetFace: d.targetFace,
        locked: d.locked,
      };
    });
    return { sceneKey: v.sceneKey, ids: v.dice.map((d) => d.ids), dice };
    // `locks` only matters for the idle view; while a roll is live its own lockedIndexes are used.
  }, [state.dice, live, activeRoll, locks, cross]);

  const visible = settled?.key === view.sceneKey ? settled : null;

  const onSettled = useCallback(
    (key: string, faces: number[], points: ScreenPoint[]) => {
      setSettled({ key, faces, points });
      // Let the upward faces travel into the result card (once per roll, full motion only).
      if (!live || key !== `roll-${live.id}` || live.source !== "roll" || live.fastForwarded || reducedMotion) return;
      if (flownKey.current === key) return;
      flownKey.current = key;
      const box = arenaRef.current?.getBoundingClientRect();
      const target = document.querySelector('[data-testid="result-panel"]')?.getBoundingClientRect();
      if (!box || !target) return;
      launchRevealFlight(
        faces.map((face, i) => {
          const label = formatFaceLabel(defaultRegistry.componentById.get(live.outcome.dice[i]!.faces[face]!)!, cross);
          return { x: box.left + points[i]!.x * box.width, y: box.top + points[i]!.y * box.height, text: label.primary, lang: label.primaryLang };
        }),
        target,
      );
    },
    [live, reducedMotion, cross],
  );

  const onImpact = useCallback(
    (strength: number) => {
      if (state.preferences.sound) playClack(strength);
    },
    [state.preferences.sound],
  );

  // Drag-to-throw: the flick's direction and speed shape the throw; the outcome is still predetermined.
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (phase === "rolling" || e.button !== 0) return;
    drag.current = { x: e.clientX, y: e.clientY, t: performance.now() };
    const onUp = (up: globalThis.PointerEvent) => {
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      const start = drag.current;
      drag.current = null;
      if (!start) return;
      const dx = up.clientX - start.x;
      const dy = up.clientY - start.y;
      const distance = Math.hypot(dx, dy);
      const speed = distance / Math.max(1, performance.now() - start.t);
      if (distance < THROW_DISTANCE_PX || speed < THROW_SPEED) return;
      suppressClick.current = true;
      window.setTimeout(() => (suppressClick.current = false), 0);
      roll({ throwParams: { power: clampPower(0.8 + speed * 0.6), dirX: dx / distance, dirZ: dy / distance } });
    };
    const onCancel = () => {
      drag.current = null;
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
    };
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget || (e.key !== " " && e.key !== "Enter")) return;
    e.preventDefault();
    if (phase === "rolling") fastForward();
    else roll({ throwParams: BUTTON_THROW });
  };

  const viewProps: DiceViewProps = {
    dice: view.dice,
    rollId: live?.id ?? null,
    sceneKey: view.sceneKey,
    startedAt: live?.startedAt ?? 0,
    timeline: live?.timeline ?? null,
    throwParams: live?.throwParams ?? BUTTON_THROW,
    fastForwarded: live?.fastForwarded ?? false,
    charging: charging && phase !== "rolling",
    reducedMotion,
    onSettled,
    onImpact,
  };
  const flat = <FlatDice {...viewProps} />;

  const faceLabel = (i: number) => {
    const faceId = visible ? view.ids[i]?.[visible.faces[i]!] : undefined;
    const component = faceId ? defaultRegistry.componentById.get(faceId) : undefined;
    return { faceId, label: component ? formatFaceLabel(component, cross) : null };
  };
  const summary = state.dice
    .map((culture, i) =>
      t("dice.dieSummary", { n: i + 1, culture: cultureName(culture), face: faceLabel(i).label?.primary ?? t("dice.notRolled") }),
    )
    .join(". ");
  const canLock = live !== null && phase !== "rolling" && visible !== null;

  return (
    <div>
      <div
        ref={arenaRef}
        className="relative aspect-[4/3] cursor-grab touch-none overflow-hidden rounded-[28px] border border-line bg-[radial-gradient(ellipse_at_50%_35%,#fffdf8_0%,#f6f1e7_55%,#efe8db_100%)] shadow-soft select-none active:cursor-grabbing sm:aspect-[16/10]"
        data-testid="dice-arena"
        data-renderer={use3d ? "webgl" : "flat"}
        data-phase={phase}
        data-fast-forwarded={live?.fastForwarded ? "true" : "false"}
        tabIndex={0}
        role="group"
        aria-roledescription={t("hero.sceneLabel")}
        aria-label={`${t("hero.sceneLabel")}. ${summary}`}
        aria-describedby={hintId}
        onPointerDown={onPointerDown}
        onKeyDown={onKeyDown}
      >
        <div className="absolute inset-0">
          {use3d ? (
            <SceneErrorBoundary fallback={flat} onError={() => setSceneFailed(true)}>
              <DiceScene {...viewProps} />
            </SceneErrorBoundary>
          ) : (
            flat
          )}
        </div>

        {/* Faint enso-like ring behind the dice. */}
        <div
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-1/2 aspect-square h-[78%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-vermilion/10"
        />

        <ul className="pointer-events-none absolute top-3 left-3 flex flex-wrap gap-1.5 sm:top-4 sm:left-4">
          {state.dice.map((culture, i) => (
            <li
              key={`${i}-${culture}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface/90 px-2.5 py-1 text-xs text-ink backdrop-blur"
            >
              <span aria-hidden className="size-2 rounded-full" style={{ background: CULTURE_THEME[culture].accent }} />
              <span className="text-muted">{t("hero.dieChip", { n: i + 1 })}</span>
              <span className="font-medium">{cultureName(culture)}</span>
            </li>
          ))}
        </ul>

        {/* Lock toggles placed over each settled die; locked dice carry a small vermilion seal. */}
        {visible &&
          visible.points.map((point, i) => {
            const locked = locks.includes(i);
            if (!canLock && !(locked && view.dice[i]?.locked)) return null;
            return (
              <button
                key={i}
                type="button"
                disabled={!canLock}
                aria-pressed={locked}
                aria-label={t(locked ? "dice.unlock" : "dice.lock", { n: i + 1 })}
                title={t(locked ? "dice.unlock" : "dice.lock", { n: i + 1 })}
                data-testid={`die-lock-${i}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!suppressClick.current) toggleLock(i);
                }}
                onKeyDown={(e) => e.stopPropagation()}
                className={`group absolute grid size-9 -translate-x-1/2 -translate-y-full place-items-center rounded-lg border shadow-sm transition-all ${
                  locked
                    ? "-rotate-6 border-vermilion bg-vermilion text-washi"
                    : "border-line bg-surface/85 text-muted opacity-70 hover:opacity-100 focus-visible:opacity-100"
                }`}
                style={{ left: `${point.x * 100}%`, top: `${Math.max(14, point.y * 100)}%` }}
              >
                {locked ? <Lock className="size-4" aria-hidden /> : <LockOpen className="size-4" aria-hidden />}
              </button>
            );
          })}

        {!use3d && webgl === false && (
          <p className="absolute right-3 bottom-3 left-3 rounded-xl bg-surface/90 px-3 py-2 text-center text-xs text-muted">
            {t("hero.fallbackNotice")}
          </p>
        )}
      </div>
      <p id={hintId} className="mt-2 text-xs text-muted">
        {t("hero.arenaShortcut")}
      </p>

      {/* Text outcome of each die, read back from the rendered dice. */}
      <ol className="mt-3 flex flex-wrap gap-2" aria-label={t("hero.sceneLabel")}>
        {state.dice.map((culture, i) => {
          const { faceId, label } = faceLabel(i);
          return (
            <li
              key={`${i}-${culture}`}
              data-testid={`die-status-${i}`}
              data-component-id={faceId ?? ""}
              data-settled={visible ? "true" : "false"}
              data-locked={locks.includes(i) ? "true" : "false"}
              className="inline-flex min-h-8 items-center gap-2 rounded-full bg-surface/70 px-3 text-sm ring-1 ring-line"
            >
              <span aria-hidden className="size-1.5 rounded-full" style={{ background: CULTURE_THEME[culture].accent }} />
              <span className="text-muted">{t("hero.dieChip", { n: i + 1 })}</span>
              <span className={`font-medium ${phase === "rolling" ? "opacity-40" : ""}`}>
                <span lang={label?.primaryLang}>{label ? label.primary : "—"}</span>
              </span>
              {label?.secondary && (
                <span lang={label.secondary.lang} dir={label.secondary.dir} className="text-xs text-muted">
                  {label.secondary.text}
                </span>
              )}
              {locks.includes(i) && <Lock className="size-3 text-vermilion-ink" aria-label={t("dice.locked")} />}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { useNameForge } from "@/components/app/NameForgeProvider";
import { CULTURE_THEME } from "@/components/culture-selector/cultureTheme";
import { defaultRegistry } from "@/data/cultures";
import { isCrossCultural } from "@/features/generation/config";
import { previewFaces } from "@/features/generation/generate";
import { formatFaceLabel } from "@/features/formatting/formatName";
import { hasWebGL } from "@/lib/webgl";
import { FlatDice } from "./FlatDice";
import { SceneErrorBoundary } from "./SceneErrorBoundary";
import type { DiceViewProps, SceneDie } from "./types";

function ArenaLoading() {
  const { t } = useNameForge();
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

export function DiceArena() {
  const { state, activeRoll, reducedMotion, t, cultureName, phase } = useNameForge();
  const webgl = useSyncExternalStore(noopSubscribe, hasWebGL, () => true);
  const [sceneFailed, setSceneFailed] = useState(false);
  const [settled, setSettled] = useState<{ key: string; faces: number[] } | null>(null);
  const use3d = webgl && state.preferences.dice3d && !sceneFailed;

  // The dice show the last roll while it matches the configuration, otherwise idle preview faces.
  const live = activeRoll && sameDice(activeRoll.outcome.result.dice, state.dice) ? activeRoll : null;
  const view = useMemo(() => {
    const cross = isCrossCultural(state.dice);
    const ids: string[][] = live ? live.outcome.dice.map((d) => [...d.faces]) : previewFaces(state.dice);
    const targets = live ? live.outcome.dice.map((d) => d.faceIndex) : state.dice.map(() => 0);
    const dice: SceneDie[] = ids.map((faces, i) => ({
      culture: state.dice[i]!,
      faces: faces.map((id) => formatFaceLabel(defaultRegistry.componentById.get(id)!, cross)),
      targetFace: targets[i]!,
    }));
    return { ids, dice, sceneKey: live ? `roll-${live.id}` : `preview-${state.dice.join("-")}` };
  }, [live, state.dice]);

  const onSettled = useCallback((key: string, faces: number[]) => setSettled({ key, faces }), []);
  const visible = settled?.key === view.sceneKey ? settled.faces : null;

  const viewProps: DiceViewProps = {
    dice: view.dice,
    rollId: live?.id ?? null,
    sceneKey: view.sceneKey,
    startedAt: live?.startedAt ?? 0,
    duration: live?.duration ?? 0,
    reducedMotion,
    onSettled,
  };
  const flat = <FlatDice {...viewProps} />;

  const cross = isCrossCultural(state.dice);
  const summary = state.dice
    .map((culture, i) => {
      const faceId = visible ? view.ids[i]?.[visible[i]!] : undefined;
      const face = faceId ? formatFaceLabel(defaultRegistry.componentById.get(faceId)!, cross).primary : t("dice.notRolled");
      return t("dice.dieSummary", { n: i + 1, culture: cultureName(culture), face });
    })
    .join(". ");

  return (
    <div>
      <div
        className="relative aspect-[4/3] overflow-hidden rounded-[28px] border border-line bg-[radial-gradient(ellipse_at_50%_35%,#fffdf8_0%,#f6f1e7_55%,#efe8db_100%)] shadow-soft sm:aspect-[16/10]"
        data-testid="dice-arena"
        data-renderer={use3d ? "webgl" : "flat"}
        data-phase={phase}
      >
        <div role="img" aria-label={`${t("hero.sceneLabel")}. ${summary}`} className="absolute inset-0">
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

        {!use3d && webgl === false && (
          <p className="absolute right-3 bottom-3 left-3 rounded-xl bg-surface/90 px-3 py-2 text-center text-xs text-muted">
            {t("hero.fallbackNotice")}
          </p>
        )}
      </div>

      {/* Text outcome of each die, read back from the rendered dice. */}
      <ol className="mt-3 flex flex-wrap gap-2" aria-label={t("hero.sceneLabel")}>
        {state.dice.map((culture, i) => {
          const faceId = visible ? view.ids[i]?.[visible[i]!] : undefined;
          const component = faceId ? defaultRegistry.componentById.get(faceId) : undefined;
          const label = component ? formatFaceLabel(component, cross) : null;
          return (
            <li
              key={`${i}-${culture}`}
              data-testid={`die-status-${i}`}
              data-component-id={faceId ?? ""}
              data-settled={visible ? "true" : "false"}
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
            </li>
          );
        })}
      </ol>
    </div>
  );
}

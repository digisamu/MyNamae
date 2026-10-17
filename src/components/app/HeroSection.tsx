"use client";

import { Dices } from "lucide-react";
import { useRef, type MouseEvent, type PointerEvent } from "react";
import { useMyNamae } from "@/components/app/MyNamaeProvider";
import { BUTTON_THROW } from "@/components/dice/choreography";
import { DiceArena } from "@/components/dice/DiceArena";
import { NameResultCard } from "@/components/name-result/NameResultCard";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { defaultRegistry } from "@/data/cultures";
import { isCrossCultural } from "@/features/generation/config";
import type { NameStyle } from "@/features/persistence/schema";
import type { GenerationMode } from "@/types/generation";
import { DailyName } from "./DailyName";

/** Holding longer than this turns a press into a charged throw. */
const CHARGE_THRESHOLD_MS = 250;
const FULL_CHARGE_MS = 1400;

export function HeroSection() {
  const { t, state, setMode, setStyle, roll, phase, configIssue, error, setCharging, locks, activeRoll } = useMyNamae();
  const mode = state.preferences.mode;
  const mixed = isCrossCultural(state.dice);
  const rolling = phase === "rolling";
  const message = configIssue ? t(`errors.${configIssue}`) : error ? t(error) : null;
  const press = useRef<{ start: number; timer: number } | null>(null);
  const handledByPointer = useRef(false);

  // The style filter is only offered when the selected culture's curated names actually record gender.
  const culture = state.dice[0]!;
  const styleAvailable =
    !mixed && mode === "established" && defaultRegistry.cultures[culture].names.some((n) => n.gender !== undefined);
  const rerolling = locks.length > 0 && activeRoll !== null && phase !== "rolling";

  const endPress = (throwIt: boolean) => {
    const p = press.current;
    if (!p) return;
    window.clearTimeout(p.timer);
    press.current = null;
    setCharging(false);
    const held = performance.now() - p.start;
    if (!throwIt) return;
    handledByPointer.current = true;
    if (held >= CHARGE_THRESHOLD_MS) {
      const charge = Math.min(1, (held - CHARGE_THRESHOLD_MS) / FULL_CHARGE_MS);
      roll({ throwParams: { ...BUTTON_THROW, power: 1 + charge * 0.6 } });
    } else {
      roll({ throwParams: BUTTON_THROW });
    }
  };

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    if (rolling || configIssue || e.button !== 0) return;
    press.current = { start: performance.now(), timer: window.setTimeout(() => setCharging(true), CHARGE_THRESHOLD_MS) };
  };
  const onClick = (e: MouseEvent<HTMLButtonElement>) => {
    // Pointer presses are handled on release; this path serves keyboard activation.
    if (handledByPointer.current) {
      handledByPointer.current = false;
      return;
    }
    if (e.detail === 0 || !press.current) roll({ throwParams: BUTTON_THROW });
  };

  return (
    <section id="generator" aria-labelledby="hero-title" className="mx-auto max-w-6xl px-4 pt-10 pb-16 sm:px-6 sm:pt-16">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="flex items-center gap-3 text-sm font-medium tracking-[0.14em] text-vermilion-ink uppercase">
            <span aria-hidden className="h-px w-8 bg-vermilion" />
            {t("hero.eyebrow")}
          </p>
          <h1 id="hero-title" className="mt-4 font-display text-4xl leading-[1.12] font-medium text-balance text-ink sm:text-5xl lg:text-6xl">
            {t("hero.titleLead")} <span className="text-vermilion-ink">{t("hero.titleAccent")}</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg">{t("hero.description")}</p>
        </div>
        <DailyName />
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-7">
          <DiceArena />

          <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <SegmentedControl<GenerationMode>
                  label={t("hero.modeLabel")}
                  value={mixed ? "creative" : mode}
                  onChange={setMode}
                  testId="mode-switch"
                  options={[
                    { value: "established", label: t("hero.modeEstablished"), disabled: mixed },
                    { value: "creative", label: t("hero.modeCreative") },
                  ]}
                />
                <p className="max-w-xs text-xs text-muted">
                  {mixed ? t("hero.modeMixedHint") : t(mode === "established" ? "hero.modeEstablishedHint" : "hero.modeCreativeHint")}
                </p>
              </div>
              {styleAvailable && (
                <div className="flex flex-col gap-1.5">
                  <SegmentedControl<NameStyle>
                    label={t("hero.style")}
                    size="sm"
                    value={state.preferences.style}
                    onChange={setStyle}
                    testId="style-filter"
                    options={[
                      { value: "any", label: t("hero.styleAny") },
                      { value: "f", label: t("hero.styleF") },
                      { value: "m", label: t("hero.styleM") },
                      { value: "u", label: t("hero.styleU") },
                    ]}
                  />
                  <p className="max-w-xs text-xs text-muted">{t("hero.styleHint")}</p>
                </div>
              )}
            </div>

            <div className="flex flex-col items-stretch gap-2 sm:items-end">
              <button
                type="button"
                onPointerDown={onPointerDown}
                onPointerUp={() => endPress(true)}
                onPointerLeave={() => endPress(false)}
                onPointerCancel={() => endPress(false)}
                onClick={onClick}
                onContextMenu={(e) => e.preventDefault()}
                disabled={rolling || configIssue !== null}
                aria-describedby={message ? "roll-message" : "roll-hint"}
                className="group inline-flex min-h-14 touch-manipulation items-center justify-center gap-3 rounded-full bg-vermilion-ink px-8 text-base font-semibold text-white shadow-[0_10px_24px_-12px_rgb(181_56_42/0.8)] transition-all select-none hover:-translate-y-0.5 hover:bg-[#a5301f] active:translate-y-0 active:scale-[0.98] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
                data-testid="roll-button"
              >
                <Dices className={`size-5 ${rolling ? "animate-spin" : "transition-transform group-hover:rotate-12"}`} aria-hidden />
                {rolling ? t("hero.rolling") : rerolling ? t("hero.rerollUnlocked") : t("hero.roll")}
              </button>
              <p id="roll-hint" className="max-w-56 text-center text-xs text-muted sm:text-right">
                {t("hero.holdHint")}
              </p>
              <a href="#combinations" className="text-center text-sm text-muted underline-offset-4 hover:text-ink hover:underline sm:text-right">
                {t("hero.editDice")}
              </a>
            </div>
          </div>
          {message && (
            <p id="roll-message" role="alert" className="mt-3 rounded-xl bg-sakura/60 px-4 py-2.5 text-sm text-vermilion-ink">
              {message}
            </p>
          )}
        </div>

        <div className="lg:col-span-5" data-testid="result-panel">
          <NameResultCard />
        </div>
      </div>
    </section>
  );
}

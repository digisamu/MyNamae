"use client";

import { Dices } from "lucide-react";
import { useNameForge } from "@/components/app/NameForgeProvider";
import { DiceArena } from "@/components/dice/DiceArena";
import { NameResultCard } from "@/components/name-result/NameResultCard";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { isCrossCultural } from "@/features/generation/config";
import type { GenerationMode } from "@/types/generation";

export function HeroSection() {
  const { t, state, setMode, roll, phase, configIssue, error } = useNameForge();
  const mode = state.preferences.mode;
  const mixed = isCrossCultural(state.dice);
  const rolling = phase === "rolling";
  const message = configIssue ? t(`errors.${configIssue}`) : error ? t(error) : null;

  return (
    <section id="generator" aria-labelledby="hero-title" className="mx-auto max-w-6xl px-4 pt-10 pb-16 sm:px-6 sm:pt-16">
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

      <div className="mt-10 grid gap-6 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-7">
          <DiceArena />

          <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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

            <div className="flex flex-col items-stretch gap-2 sm:items-end">
              <button
                type="button"
                onClick={() => roll()}
                disabled={rolling || configIssue !== null}
                aria-describedby={message ? "roll-message" : undefined}
                className="group inline-flex min-h-14 items-center justify-center gap-3 rounded-full bg-vermilion-ink px-8 text-base font-semibold text-white shadow-[0_10px_24px_-12px_rgb(181_56_42/0.8)] transition-all hover:-translate-y-0.5 hover:bg-[#a5301f] active:translate-y-0 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
                data-testid="roll-button"
              >
                <Dices className={`size-5 ${rolling ? "animate-spin" : "transition-transform group-hover:rotate-12"}`} aria-hidden />
                {rolling ? t("hero.rolling") : t("hero.roll")}
              </button>
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

        <div className="lg:col-span-5">
          <NameResultCard />
        </div>
      </div>
    </section>
  );
}

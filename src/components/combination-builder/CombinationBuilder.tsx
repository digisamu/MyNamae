"use client";

import { ArrowDown, ArrowUp, Dices, Plus, X } from "lucide-react";
import { useMemo } from "react";
import { useNameForge } from "@/components/app/NameForgeProvider";
import { CultureMotif } from "@/components/culture-selector/CultureMotif";
import { CULTURE_THEME } from "@/components/culture-selector/cultureTheme";
import { formatGeneratedName } from "@/features/formatting/formatName";
import { isCrossCultural } from "@/features/generation/config";
import { generateName, slotFor } from "@/features/generation/generate";
import { createSeededRandom } from "@/lib/random";
import { MAX_DICE, MIN_DICE } from "@/types/generation";
import { CULTURE_IDS, type CultureId } from "@/types/names";

const PRESETS: readonly CultureId[][] = [
  ["turkic", "turkic"],
  ["japanese", "japanese"],
  ["arabic", "arabic"],
  ["turkic", "japanese"],
  ["arabic", "japanese"],
  ["turkic", "arabic"],
  ["turkic", "arabic", "japanese"],
];

function seedFor(dice: readonly string[]): number {
  return [...dice.join("|")].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
}

export function CombinationBuilder() {
  const { t, state, setDice, cultureName, roll, phase, configIssue } = useNameForge();
  const dice = state.dice;
  const mode = state.preferences.mode;

  const update = (index: number, culture: CultureId) => setDice(dice.map((c, i) => (i === index ? culture : c)));
  const move = (index: number, delta: number) => {
    const next = [...dice];
    const target = index + delta;
    [next[index], next[target]] = [next[target]!, next[index]!];
    setDice(next);
  };
  const remove = (index: number) => setDice(dice.filter((_, i) => i !== index));
  const add = () => {
    const unused = CULTURE_IDS.find((c) => !dice.includes(c)) ?? CULTURE_IDS.find((c) => c !== dice.at(-1))!;
    setDice([...dice, unused]);
  };

  // A real, reproducible sample from the generator for this configuration.
  const preview = useMemo(() => {
    const res = generateName({ dice, mode }, { rng: createSeededRandom(seedFor(dice)), now: () => 0, createId: () => "preview" });
    return res.ok ? formatGeneratedName(res.outcome.result) : null;
  }, [dice, mode]);

  const comboLabel = (combo: readonly CultureId[]) => combo.map(cultureName).join(" + ");
  const writing = preview
    ? [t(`scripts.${preview.scriptType}`), preview.secondaryScript && t(`scripts.${preview.secondaryScript}`)]
        .filter(Boolean)
        .join(" · ")
    : "";

  return (
    <section id="combinations" aria-labelledby="builder-title" className="border-y border-line/70 bg-ivory/50">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="max-w-2xl">
          <h2 id="builder-title" className="font-display text-3xl font-medium text-ink">
            {t("builder.title")}
          </h2>
          <p className="mt-3 leading-relaxed text-muted">{t("builder.description")}</p>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-12">
          <div className="rounded-3xl border border-line bg-surface p-5 sm:p-6 lg:col-span-7">
            <ol className="flex flex-col gap-3" data-testid="builder-dice">
              {dice.map((culture, i) => {
                const theme = CULTURE_THEME[culture];
                const selectId = `die-culture-${i}`;
                return (
                  <li
                    key={i}
                    className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-washi p-3 sm:flex-nowrap"
                  >
                    <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${theme.bg} ${theme.text}`}>
                      <CultureMotif culture={culture} className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <label htmlFor={selectId} className="block text-xs text-muted">
                        {t("builder.die", { n: i + 1 })} · {t(`builder.position.${slotFor(i, dice.length)}`)}
                      </label>
                      <select
                        id={selectId}
                        value={culture}
                        onChange={(e) => update(i, e.target.value as CultureId)}
                        aria-label={t("builder.cultureFor", { n: i + 1 })}
                        className="mt-0.5 w-full min-w-36 cursor-pointer rounded-lg border border-line bg-surface px-2 py-1.5 font-medium text-ink"
                        data-testid={`die-select-${i}`}
                      >
                        {CULTURE_IDS.map((c) => (
                          <option key={c} value={c}>
                            {cultureName(c)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <IconButton label={t("builder.moveUp", { n: i + 1 })} disabled={i === 0} onClick={() => move(i, -1)}>
                        <ArrowUp className="size-4" aria-hidden />
                      </IconButton>
                      <IconButton
                        label={t("builder.moveDown", { n: i + 1 })}
                        disabled={i === dice.length - 1}
                        onClick={() => move(i, 1)}
                      >
                        <ArrowDown className="size-4" aria-hidden />
                      </IconButton>
                      <IconButton label={t("builder.removeDie", { n: i + 1 })} disabled={dice.length <= MIN_DICE} onClick={() => remove(i)}>
                        <X className="size-4" aria-hidden />
                      </IconButton>
                    </div>
                  </li>
                );
              })}
            </ol>

            <button
              type="button"
              onClick={add}
              disabled={dice.length >= MAX_DICE}
              className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-line-strong text-sm font-medium text-muted hover:bg-washi hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
              data-testid="add-die"
            >
              <Plus className="size-4" aria-hidden />
              {t("builder.addDie")}
            </button>

            {configIssue && (
              <p role="alert" className="mt-3 rounded-xl bg-sakura/60 px-4 py-2.5 text-sm text-vermilion-ink">
                {t(`errors.${configIssue}`)}
              </p>
            )}

            <div className="mt-6">
              <h3 className="text-xs font-medium tracking-[0.14em] text-muted uppercase">{t("builder.presets")}</h3>
              <ul className="mt-3 flex flex-wrap gap-2">
                {PRESETS.map((combo) => {
                  const active = combo.length === dice.length && combo.every((c, i) => c === dice[i]);
                  return (
                    <li key={combo.join("-")}>
                      <button
                        type="button"
                        aria-pressed={active}
                        aria-label={t("builder.applyPreset", { combo: comboLabel(combo) })}
                        onClick={() => setDice([...combo])}
                        className={`min-h-9 rounded-full border px-3 text-sm transition-colors ${
                          active ? "border-ink bg-ink text-washi" : "border-line bg-washi hover:border-line-strong"
                        }`}
                      >
                        {comboLabel(combo)}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          <aside className="flex flex-col rounded-3xl border border-line bg-surface p-5 sm:p-6 lg:col-span-5" aria-labelledby="preview-title">
            <h3 id="preview-title" className="text-xs font-medium tracking-[0.14em] text-muted uppercase">
              {t("builder.preview")}
            </h3>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {dice.map((culture, i) => (
                <span key={i} className="flex items-center gap-2">
                  {i > 0 && <span aria-hidden className="text-muted">+</span>}
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm ${CULTURE_THEME[culture].bg} ${CULTURE_THEME[culture].text}`}>
                    <CultureMotif culture={culture} className="size-4" />
                    {cultureName(culture)}
                  </span>
                </span>
              ))}
            </div>
            {preview ? (
              <div className="mt-6 rounded-2xl bg-washi p-5">
                <p
                  lang={preview.primaryLang}
                  className={`${preview.primaryLang === "ja" ? "font-mincho" : "font-display"} text-3xl font-medium break-words`}
                >
                  {preview.primaryText}
                </p>
                {preview.secondaryText && (
                  <p lang={preview.secondaryLang ?? undefined} dir={preview.textDirection} className="mt-1 text-left text-lg text-muted">
                    {preview.secondaryText}
                  </p>
                )}
                <p className="mt-3 text-xs text-muted">{writing}</p>
              </div>
            ) : (
              <p className="mt-6 text-sm text-muted">{t("builder.previewEmpty")}</p>
            )}
            {isCrossCultural(dice) && <p className="mt-4 text-sm leading-relaxed text-muted">{t("builder.authenticityNote")}</p>}
            <div aria-hidden className="hidden min-h-6 flex-1 lg:block" />
            <button
              type="button"
              onClick={() => {
                roll();
                document.getElementById("generator")?.scrollIntoView({ block: "start" });
              }}
              disabled={configIssue !== null || phase === "rolling"}
              className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-washi hover:bg-black disabled:opacity-50 lg:mt-auto"
            >
              <Dices className="size-4" aria-hidden />
              {t("builder.rollThis")}
            </button>
          </aside>
        </div>
      </div>
    </section>
  );
}

function IconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-10 place-items-center rounded-full border border-line bg-surface text-muted hover:text-ink disabled:cursor-not-allowed disabled:opacity-35"
    >
      {children}
    </button>
  );
}

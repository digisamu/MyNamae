"use client";

import { Check, Copy, Dices, Heart } from "lucide-react";
import { useState } from "react";
import { useNameForge } from "@/components/app/NameForgeProvider";
import { CULTURE_THEME } from "@/components/culture-selector/cultureTheme";
import { formatGeneratedName, type FormattedName } from "@/features/formatting/formatName";
import type { MessageKey } from "@/features/localization/i18n";
import { copyText } from "@/lib/clipboard";
import { NameDisplay } from "./NameDisplay";

function romanizationLabel(f: FormattedName): MessageKey {
  if (f.latinSystem === "hepburn") return "scripts.hepburn";
  if (f.latinSystem === "arabic-translit") return "scripts.arabic-translit";
  return "scripts.en-latin";
}

export function NameResultCard() {
  const { currentResult, phase, t, cultureName, listCultures, isFavorite, toggleFavorite, roll, configIssue } =
    useNameForge();
  const [copyState, setCopyState] = useState<{ id: string; ok: boolean } | null>(null);
  const formatted = currentResult ? formatGeneratedName(currentResult) : null;

  if (!currentResult || !formatted) {
    return (
      <section
        aria-labelledby="result-title"
        className="flex h-full min-h-72 flex-col justify-center rounded-[28px] border border-dashed border-line-strong bg-surface/60 p-8 text-center"
      >
        <h2 id="result-title" className="sr-only">
          {t("result.title")}
        </h2>
        <span aria-hidden lang="ja" className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl border border-vermilion/30 font-mincho text-2xl text-vermilion/70">
          名
        </span>
        <p className="font-display text-lg text-muted">{t("result.empty")}</p>
      </section>
    );
  }

  const favorite = isFavorite(currentResult);
  const scripts = [t(`scripts.${formatted.scriptType}`), formatted.secondaryScript && t(`scripts.${formatted.secondaryScript}`)]
    .filter(Boolean)
    .join(" · ");
  const established = formatted.linguisticStatus !== "creative";
  const copied = copyState?.id === currentResult.id ? copyState : null;

  const onCopy = async () => {
    const ok = await copyText(formatted.primaryText);
    setCopyState({ id: currentResult.id, ok });
  };

  return (
    <section
      aria-labelledby="result-title"
      className={`relative flex h-full flex-col rounded-[28px] border border-line bg-surface p-6 shadow-soft transition-opacity sm:p-8 ${
        phase === "rolling" ? "opacity-60" : ""
      }`}
      data-testid="result-card"
      data-result-id={currentResult.id}
    >
      <div className="flex items-start justify-between gap-4">
        <h2 id="result-title" className="text-xs font-medium tracking-[0.18em] text-muted uppercase">
          {t("result.title")}
        </h2>
        <span
          key={`stamp-${currentResult.id}`}
          className={`inline-flex shrink-0 animate-stamp items-center rounded-md border-2 px-2 py-0.5 text-xs font-semibold ${
            established ? "border-vermilion text-vermilion-ink" : "border-line-strong text-muted"
          }`}
          data-testid="result-status"
        >
          {t(`result.status.${formatted.linguisticStatus}`)}
        </span>
      </div>

      <div key={currentResult.id} className="mt-5 animate-reveal">
        <NameDisplay formatted={formatted} testId="result-name" />
        <p className="mt-3 text-xs tracking-wide text-muted">{scripts}</p>
        {formatted.secondaryUnavailable === "az-cyrillic" && (
          <p className="mt-2 text-sm text-muted">{t("result.cyrillicUnavailable")}</p>
        )}
      </div>

      <dl className="mt-6 grid gap-4 border-t border-line pt-5 text-sm">
        {formatted.romanization && formatted.romanization !== formatted.primaryText && (
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            <dt className="w-28 shrink-0 text-muted">{t(romanizationLabel(formatted))}</dt>
            <dd className="font-medium" data-testid="result-romanization">
              {formatted.romanization}
            </dd>
          </div>
        )}
        {formatted.meaning && (
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            <dt className="w-28 shrink-0 text-muted">{t("result.meaning")}</dt>
            <dd lang="en">{formatted.meaning}</dd>
          </div>
        )}
        <div className="flex flex-wrap gap-x-3 gap-y-2">
          <dt className="w-28 shrink-0 text-muted">{t("result.fromDice")}</dt>
          <dd>
            <ol className="flex flex-wrap gap-1.5">
              {formatted.components.map((c, i) => (
                <li
                  key={`${i}-${c.componentId}`}
                  data-testid={`result-component-${i}`}
                  data-component-id={c.componentId}
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs ${CULTURE_THEME[c.culture].bg}`}
                >
                  <span className="font-semibold text-muted">{i + 1}</span>
                  <span className="font-medium text-ink">{c.label}</span>
                  {c.native && (
                    <span lang={c.native.lang} dir={c.native.dir} className="text-muted">
                      {c.native.text}
                    </span>
                  )}
                  <span className={`${CULTURE_THEME[c.culture].text}`}>· {cultureName(c.culture)}</span>
                </li>
              ))}
            </ol>
          </dd>
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          <dt className="w-28 shrink-0 text-muted">{t("result.cultures")}</dt>
          <dd>{listCultures(formatted.cultureLabels)}</dd>
        </div>
      </dl>

      <p className="mt-5 text-sm leading-relaxed text-muted">
        {t(`result.explanation.${currentResult.explanation}`)}
        {formatted.cultureLabels.length > 1 && <> {t("result.mixedNote")}</>}
      </p>

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-6">
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line-strong px-4 text-sm font-medium hover:bg-ivory"
        >
          {copied?.ok ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
          {t("result.copy")}
        </button>
        <button
          type="button"
          aria-pressed={favorite}
          aria-label={t(favorite ? "result.unfavoriteAria" : "result.favoriteAria", { name: formatted.primaryText })}
          onClick={() => toggleFavorite(currentResult)}
          className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors ${
            favorite ? "border-vermilion/40 bg-sakura text-vermilion-ink" : "border-line-strong hover:bg-ivory"
          }`}
          data-testid="favorite-toggle"
        >
          <Heart className={`size-4 ${favorite ? "fill-current" : ""}`} aria-hidden />
          {t(favorite ? "result.unfavorite" : "result.favorite")}
        </button>
        <button
          type="button"
          onClick={() => roll()}
          disabled={phase === "rolling" || configIssue !== null}
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-4 text-sm font-medium text-washi hover:bg-black disabled:opacity-50"
        >
          <Dices className="size-4" aria-hidden />
          {t("result.rollAgain")}
        </button>
        <span role="status" className="w-full text-xs text-muted sm:w-auto">
          {copied ? t(copied.ok ? "result.copied" : "result.copyFailed") : ""}
        </span>
      </div>
    </section>
  );
}

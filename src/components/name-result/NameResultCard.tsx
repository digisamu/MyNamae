"use client";

import { Check, Copy, Dices, Download, Heart, Link2, Lock, LockOpen, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useMyNamae } from "@/components/app/MyNamaeProvider";
import { CULTURE_THEME } from "@/components/culture-selector/cultureTheme";
import { formatGeneratedName, type FormattedName } from "@/features/formatting/formatName";
import type { MessageKey } from "@/features/localization/i18n";
import { downloadBlob, renderResultCard } from "@/features/share/cardImage";
import { shareUrl } from "@/features/share/shareLink";
import { usePronunciation } from "@/features/speech/usePronunciation";
import { copyText } from "@/lib/clipboard";
import { launchPetals } from "./revealEffects";
import { NameDisplay } from "./NameDisplay";

function romanizationLabel(f: FormattedName): MessageKey {
  if (f.latinSystem === "hepburn") return "scripts.hepburn";
  if (f.latinSystem === "arabic-translit") return "scripts.arabic-translit";
  return "scripts.en-latin";
}

type Status = { id: string; key: MessageKey } | null;

const actionClass =
  "inline-flex min-h-11 items-center gap-2 rounded-full border border-line-strong px-4 text-sm font-medium hover:bg-ivory disabled:cursor-not-allowed disabled:opacity-50";

export function NameResultCard() {
  const {
    currentResult,
    phase,
    t,
    cultureName,
    listCultures,
    isFavorite,
    toggleFavorite,
    roll,
    configIssue,
    activeRoll,
    reducedMotion,
    locks,
    toggleLock,
  } = useMyNamae();
  const [status, setStatus] = useState<Status>(null);
  const cardRef = useRef<HTMLElement>(null);
  const formatted = currentResult ? formatGeneratedName(currentResult) : null;
  const pronunciation = usePronunciation(formatted);
  const fromRoll = activeRoll?.source === "roll" && activeRoll.outcome.result.id === currentResult?.id;

  // A few petals once per revealed roll (never for shared links, never with reduced motion).
  const revealedId = fromRoll && !reducedMotion ? currentResult?.id : undefined;
  useEffect(() => {
    if (!revealedId || !cardRef.current) return;
    launchPetals(cardRef.current.getBoundingClientRect());
  }, [revealedId]);

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

  const id = currentResult.id;
  const favorite = isFavorite(currentResult);
  const scripts = [t(`scripts.${formatted.scriptType}`), formatted.secondaryScript && t(`scripts.${formatted.secondaryScript}`)]
    .filter(Boolean)
    .join(" · ");
  const established = formatted.linguisticStatus !== "creative";
  const shown = status?.id === id ? status.key : null;
  // Dice can be locked only while the card shows the dice's current outcome.
  const lockable = activeRoll !== null && activeRoll.outcome.result.id === id && phase !== "rolling";

  const onCopy = async () => setStatus({ id, key: (await copyText(formatted.primaryText)) ? "result.copied" : "result.copyFailed" });

  const onShare = async () => {
    const url = shareUrl(currentResult, window.location.origin);
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: t("result.shareTitle"), text: formatted.primaryText, url });
        setStatus({ id, key: "result.shared" });
        return;
      } catch (e) {
        if ((e as DOMException).name === "AbortError") return;
      }
    }
    setStatus({ id, key: (await copyText(url)) ? "result.linkCopied" : "result.copyFailed" });
  };

  const onDownload = async () => {
    try {
      const blob = await renderResultCard(formatted, {
        components: formatted.components.map((c) => `${c.label} · ${cultureName(c.culture)}`),
        tagline: t("card.tagline"),
      });
      const slug = currentResult.components.map((c) => c.componentId.split("-").slice(1).join("")).join("-");
      downloadBlob(blob, `mynamae-${slug}.png`);
    } catch {
      setStatus({ id, key: "result.downloadFailed" });
    }
  };

  return (
    <section
      ref={cardRef}
      aria-labelledby="result-title"
      className={`relative flex h-full flex-col rounded-[28px] border border-line bg-surface p-6 shadow-soft transition-opacity sm:p-8 ${
        phase === "rolling" ? "opacity-60" : ""
      }`}
      data-testid="result-card"
      data-result-id={id}
    >
      <div className="flex items-start justify-between gap-4">
        <h2 id="result-title" className="text-xs font-medium tracking-[0.18em] text-muted uppercase">
          {t("result.title")}
        </h2>
        <span
          key={`stamp-${id}`}
          className={`inline-flex shrink-0 animate-stamp items-center rounded-md border-2 px-2 py-0.5 text-xs font-semibold ${
            established ? "border-vermilion text-vermilion-ink" : "border-line-strong text-muted"
          }`}
          data-testid="result-status"
        >
          {t(`result.status.${formatted.linguisticStatus}`)}
        </span>
      </div>

      <div key={id} className="mt-5">
        <NameDisplay formatted={formatted} testId="result-name" reveal={fromRoll} />
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
              {formatted.components.map((c, i) => {
                const locked = lockable && locks.includes(i);
                return (
                  <li
                    key={`${i}-${c.componentId}`}
                    data-testid={`result-component-${i}`}
                    data-component-id={c.componentId}
                    className={`inline-flex items-center gap-1.5 rounded-full py-1 pr-1 pl-2.5 text-xs ${CULTURE_THEME[c.culture].bg} ${
                      locked ? "ring-1 ring-vermilion" : ""
                    }`}
                  >
                    <span className="font-semibold text-muted">{i + 1}</span>
                    <span className="font-medium text-ink">{c.label}</span>
                    {c.native && (
                      <span lang={c.native.lang} dir={c.native.dir} className="text-muted">
                        {c.native.text}
                      </span>
                    )}
                    <span className={CULTURE_THEME[c.culture].text}>· {cultureName(c.culture)}</span>
                    {lockable && (
                      <button
                        type="button"
                        aria-pressed={locked}
                        aria-label={t(locked ? "dice.unlock" : "dice.lock", { n: i + 1 })}
                        title={t(locked ? "dice.unlock" : "dice.lock", { n: i + 1 })}
                        onClick={() => toggleLock(i)}
                        data-testid={`result-lock-${i}`}
                        className={`grid size-7 place-items-center rounded-full ${locked ? "bg-vermilion text-washi" : "bg-surface/80 text-muted hover:text-ink"}`}
                      >
                        {locked ? <Lock className="size-3.5" aria-hidden /> : <LockOpen className="size-3.5" aria-hidden />}
                      </button>
                    )}
                  </li>
                );
              })}
            </ol>
            {lockable && <p className="mt-2 text-xs text-muted">{t("result.lockHint")}</p>}
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
          onClick={() => roll()}
          disabled={phase === "rolling" || configIssue !== null}
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-4 text-sm font-medium text-washi hover:bg-black disabled:opacity-50"
        >
          <Dices className="size-4" aria-hidden />
          {locks.length > 0 && lockable ? t("hero.rerollUnlocked") : t("result.rollAgain")}
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
        <button type="button" onClick={onCopy} className={actionClass}>
          {shown === "result.copied" ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
          {t("result.copy")}
        </button>
        <button type="button" onClick={onShare} className={actionClass} data-testid="share-link">
          <Link2 className="size-4" aria-hidden />
          {t("result.share")}
        </button>
        <button type="button" onClick={onDownload} className={actionClass} data-testid="download-card">
          <Download className="size-4" aria-hidden />
          {t("result.download")}
        </button>
        {pronunciation.available ? (
          <button type="button" onClick={pronunciation.speak} className={actionClass} data-testid="listen">
            <Volume2 className="size-4" aria-hidden />
            {t("result.listen")}
          </button>
        ) : (
          <span className="inline-flex min-h-11 items-center gap-2 px-2 text-xs text-muted" data-testid="listen-unavailable">
            <VolumeX className="size-4" aria-hidden />
            {t("result.pronunciationUnavailable")}
          </span>
        )}
        <span role="status" className="w-full text-xs text-muted">
          {shown ? t(shown) : ""}
        </span>
      </div>
    </section>
  );
}

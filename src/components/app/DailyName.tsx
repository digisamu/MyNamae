"use client";

import { useSyncExternalStore } from "react";
import { useMyNamae } from "@/components/app/MyNamaeProvider";
import { CULTURE_THEME } from "@/components/culture-selector/cultureTheme";
import { NameDisplay } from "@/components/name-result/NameDisplay";
import { formatGeneratedName } from "@/features/formatting/formatName";
import { dayKey, nameOfTheDay } from "@/features/generation/nameOfTheDay";

const noopSubscribe = () => () => {};
// Read on the client so the date is never frozen into server-rendered HTML.
const today = () => dayKey(new Date());

/** The curated name everyone sees today (date-seeded, no randomness per visitor). */
export function DailyName() {
  const { t, locale, cultureName, setSelectedCultures, setMode } = useMyNamae();
  const key = useSyncExternalStore(noopSubscribe, today, () => null);
  if (!key) return <div className="hidden min-h-36 w-full max-w-xs lg:block" aria-hidden />;

  const daily = nameOfTheDay(new Date(`${key}T12:00:00Z`));
  const formatted = formatGeneratedName(daily);
  if (!formatted) return null;
  const culture = daily.dice[0]!;
  const date = new Intl.DateTimeFormat(locale, { month: "long", day: "numeric", timeZone: "UTC" }).format(new Date(`${key}T12:00:00Z`));

  return (
    <aside
      aria-labelledby="daily-title"
      className="w-full max-w-xs rounded-3xl border border-line bg-surface/80 p-5 shadow-soft"
      data-testid="daily-name"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 id="daily-title" className="text-xs font-medium tracking-[0.16em] text-vermilion-ink uppercase">
          {t("daily.title")}
        </h2>
        <span className={`rounded-full px-2 py-0.5 text-xs ${CULTURE_THEME[culture].bg} ${CULTURE_THEME[culture].text}`}>
          {cultureName(culture)}
        </span>
      </div>
      <div className="mt-3">
        <NameDisplay formatted={formatted} size="sm" />
      </div>
      {formatted.romanization && formatted.romanization !== formatted.primaryText && (
        <p className="mt-1 text-xs text-muted">{formatted.romanization}</p>
      )}
      {formatted.meaning && (
        <p lang="en" className="mt-2 text-sm text-ink">
          {formatted.meaning}
        </p>
      )}
      <p className="mt-2 text-xs text-muted">{t("daily.note", { date })}</p>
      <button
        type="button"
        onClick={() => {
          setSelectedCultures([culture]);
          setMode("established");
        }}
        className="mt-3 text-sm font-medium text-vermilion-ink underline-offset-4 hover:underline"
      >
        {t("daily.rollCulture", { culture: cultureName(culture) })}
      </button>
    </aside>
  );
}

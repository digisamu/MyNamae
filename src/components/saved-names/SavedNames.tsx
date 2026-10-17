"use client";

import { Check, Copy, Heart, RotateCcw, Trash2 } from "lucide-react";
import { useRef, useState, type KeyboardEvent } from "react";
import { useMyNamae } from "@/components/app/MyNamaeProvider";
import { CULTURE_THEME } from "@/components/culture-selector/cultureTheme";
import { NameDisplay } from "@/components/name-result/NameDisplay";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatGeneratedName } from "@/features/formatting/formatName";
import { formatDateTime } from "@/features/localization/i18n";
import { copyText } from "@/lib/clipboard";
import type { NameResult } from "@/types/generation";

type Tab = "recent" | "favorites";

export function SavedNames() {
  const { t, state, clearHistory, functionalAllowed, hydrated, setCookieSettingsOpen } = useMyNamae();
  const [tab, setTab] = useState<Tab>("recent");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const tabRefs = useRef<Record<Tab, HTMLButtonElement | null>>({ recent: null, favorites: null });
  const items = tab === "recent" ? state.history : state.favorites;

  const onTabKey = (e: KeyboardEvent) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const next: Tab = tab === "recent" ? "favorites" : "recent";
    setTab(next);
    tabRefs.current[next]?.focus();
  };

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "recent", label: t("saved.recent"), count: state.history.length },
    { id: "favorites", label: t("saved.favorites"), count: state.favorites.length },
  ];

  return (
    <section id="favorites" aria-labelledby="saved-title" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <h2 id="saved-title" className="font-display text-3xl font-medium text-ink">
          {t("saved.title")}
        </h2>
        <div role="tablist" aria-label={t("saved.title")} className="inline-flex self-start rounded-full border border-line bg-surface p-1">
          {tabs.map(({ id, label, count }) => (
            <button
              key={id}
              ref={(el) => {
                tabRefs.current[id] = el;
              }}
              id={`tab-${id}`}
              type="button"
              role="tab"
              aria-selected={tab === id}
              aria-controls={`panel-${id}`}
              tabIndex={tab === id ? 0 : -1}
              onClick={() => setTab(id)}
              onKeyDown={onTabKey}
              data-testid={`tab-${id}`}
              className={`inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-medium ${
                tab === id ? "bg-ink text-washi" : "text-muted hover:text-ink"
              }`}
            >
              {label}
              <span className={`rounded-full px-1.5 text-xs ${tab === id ? "bg-washi/20" : "bg-ivory"}`}>{count}</span>
            </button>
          ))}
        </div>
      </div>

      {hydrated && !functionalAllowed && (
        <p className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-2xl border border-line bg-ivory/70 px-4 py-3 text-sm text-muted" data-testid="session-only-note">
          <span>{t("saved.sessionOnly")}</span>
          <button
            type="button"
            onClick={() => setCookieSettingsOpen(true)}
            className="font-medium text-vermilion-ink underline-offset-4 hover:underline"
          >
            {t("saved.sessionLink")}
          </button>
        </p>
      )}

      <div id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`} className="mt-8" tabIndex={0}>
        {items.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-line-strong bg-surface/50 px-6 py-12 text-center">
            <Heart className="mx-auto size-6 text-vermilion/50" aria-hidden />
            <p className="mt-3 text-muted">{tab === "recent" ? t("saved.emptyRecent") : t("saved.emptyFavorites")}</p>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid={`${tab}-list`}>
            {items.map((item) => (
              <SavedItem key={item.id} item={item} />
            ))}
          </ul>
        )}

        {tab === "recent" && state.history.length > 0 && (
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line-strong px-4 text-sm text-muted hover:bg-ivory hover:text-ink"
            >
              <Trash2 className="size-4" aria-hidden />
              {t("saved.clearHistory")}
            </button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title={t("saved.clearTitle")}
        body={t("saved.clearBody")}
        confirmLabel={t("saved.confirmClear")}
        cancelLabel={t("saved.cancel")}
        onConfirm={clearHistory}
        onClose={() => setConfirmOpen(false)}
      />
    </section>
  );
}

function SavedItem({ item }: { item: NameResult }) {
  const { t, locale, cultureName, listCultures, isFavorite, toggleFavorite, roll, phase } = useMyNamae();
  const [copied, setCopied] = useState(false);
  const formatted = formatGeneratedName(item);
  if (!formatted) return null;
  const favorite = isFavorite(item);
  const name = formatted.primaryText;

  return (
    <li className="flex flex-col rounded-2xl border border-line bg-surface p-4" data-testid="saved-item">
      <div className="flex items-start justify-between gap-3">
        <NameDisplay formatted={formatted} size="sm" />
        <button
          type="button"
          aria-pressed={favorite}
          aria-label={t(favorite ? "saved.remove" : "saved.favorite", { name })}
          onClick={() => toggleFavorite(item)}
          className={`grid size-10 shrink-0 place-items-center rounded-full ${favorite ? "bg-sakura text-vermilion-ink" : "text-muted hover:bg-ivory"}`}
          data-testid="saved-favorite"
        >
          <Heart className={`size-4 ${favorite ? "fill-current" : ""}`} aria-hidden />
        </button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
        {item.dice.map((culture, i) => (
          <span key={i} className={`rounded-full px-2 py-0.5 ${CULTURE_THEME[culture].bg} ${CULTURE_THEME[culture].text}`}>
            {formatted.components[i]?.label} · {cultureName(culture)}
          </span>
        ))}
      </div>
      <div className="mt-auto flex items-center justify-between gap-2 pt-3">
        <time dateTime={new Date(item.createdAt).toISOString()} className="text-xs text-muted">
          {formatDateTime(locale, item.createdAt)} · {t(`result.status.${formatted.linguisticStatus}`)}
        </time>
        <div className="flex gap-1">
          <button
            type="button"
            aria-label={t("saved.copy", { name })}
            title={t("saved.copy", { name })}
            onClick={async () => setCopied(await copyText(name))}
            className="grid size-10 place-items-center rounded-full text-muted hover:bg-ivory hover:text-ink"
          >
            {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
          </button>
          <button
            type="button"
            aria-label={t("saved.regenerate", { cultures: listCultures(item.dice) })}
            title={t("saved.regenerate", { cultures: listCultures(item.dice) })}
            disabled={phase === "rolling"}
            onClick={() => {
              roll({ dice: item.dice, mode: item.requestedMode, ignoreLocks: true });
              document.getElementById("generator")?.scrollIntoView({ block: "start" });
            }}
            className="grid size-10 place-items-center rounded-full text-muted hover:bg-ivory hover:text-ink disabled:opacity-40"
          >
            <RotateCcw className="size-4" aria-hidden />
          </button>
        </div>
      </div>
    </li>
  );
}

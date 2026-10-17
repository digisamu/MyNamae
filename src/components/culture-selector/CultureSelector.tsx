"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import { useMyNamae } from "@/components/app/MyNamaeProvider";
import { defaultRegistry } from "@/data/cultures";
import { uniqueCultures } from "@/features/generation/config";
import { formatComponent } from "@/features/formatting/formatName";
import { CULTURE_IDS, type CultureId } from "@/types/names";
import { CultureMotif } from "./CultureMotif";
import { CULTURE_THEME } from "./cultureTheme";

export function CultureSelector() {
  const { t, state, setSelectedCultures, cultureName } = useMyNamae();
  const selected = uniqueCultures(state.dice);
  const [warning, setWarning] = useState(false);

  const toggle = (culture: CultureId) => {
    const isSelected = selected.includes(culture);
    if (isSelected && selected.length === 1) {
      setWarning(true);
      return;
    }
    setWarning(false);
    setSelectedCultures(isSelected ? selected.filter((c) => c !== culture) : [...selected, culture]);
  };

  return (
    <section aria-labelledby="cultures-title" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <h2 id="cultures-title" className="font-display text-3xl font-medium text-ink">
            {t("selector.title")}
          </h2>
          <p className="mt-3 leading-relaxed text-muted">{t("selector.description")}</p>
        </div>
        <p className="text-sm text-muted" aria-live="polite">
          {selected.length === 1 ? t("selector.singleHint") : t("selector.mixedHint", { count: selected.length })}
        </p>
      </div>

      <ul className="mt-8 grid gap-4 md:grid-cols-3">
        {CULTURE_IDS.map((culture) => {
          const theme = CULTURE_THEME[culture];
          const isSelected = selected.includes(culture);
          const examples = defaultRegistry.cultures[culture].previewComponentIds
            .map((id) => defaultRegistry.componentById.get(id))
            .filter((c) => c !== undefined)
            .map(formatComponent);
          return (
            <li key={culture}>
              <button
                type="button"
                aria-pressed={isSelected}
                onClick={() => toggle(culture)}
                data-testid={`culture-card-${culture}`}
                className={`group relative flex h-full w-full flex-col rounded-3xl border bg-surface p-6 text-left transition-all hover:-translate-y-0.5 hover:shadow-soft ${
                  isSelected ? `${theme.border} shadow-soft ring-1 ${theme.ring}` : "border-line"
                }`}
              >
                <span className="flex items-start justify-between">
                  <span className={`grid size-12 place-items-center rounded-2xl ${theme.bg} ${theme.text}`}>
                    <CultureMotif culture={culture} className="size-6" />
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-opacity ${
                      isSelected ? `${theme.bg} ${theme.text} opacity-100` : "opacity-0"
                    }`}
                    aria-hidden={!isSelected}
                  >
                    <Check className="size-3.5" aria-hidden />
                    {t("selector.selected")}
                  </span>
                </span>
                <span className="mt-5 font-display text-xl font-medium text-ink">{cultureName(culture)}</span>
                <span className="mt-2 text-sm leading-relaxed text-muted">{t(`cultures.${culture}.description`)}</span>
                <span className="mt-5 text-[0.7rem] font-medium tracking-[0.14em] text-muted uppercase">
                  {t("selector.examples")}
                </span>
                <span className="mt-2 flex flex-wrap gap-1.5">
                  {examples.map((c) => (
                    <span key={c.componentId} className="inline-flex items-baseline gap-1 rounded-lg border border-line bg-washi px-2 py-1 text-sm">
                      <span className="font-medium">{c.label}</span>
                      {c.native && (
                        <span lang={c.native.lang} dir={c.native.dir} className="text-xs text-muted">
                          {c.native.text}
                        </span>
                      )}
                    </span>
                  ))}
                </span>
                <span aria-hidden className="absolute inset-x-6 bottom-0 h-0.5 rounded-full opacity-60" style={{ background: isSelected ? theme.accent : "transparent" }} />
              </button>
            </li>
          );
        })}
      </ul>
      {warning && selected.length === 1 && (
        <p role="alert" className="mt-4 text-sm text-vermilion-ink">
          {t("selector.keepOne")}
        </p>
      )}
    </section>
  );
}

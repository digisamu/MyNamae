"use client";

import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useMyNamae } from "@/components/app/MyNamaeProvider";
import type { MessageKey } from "@/features/localization/i18n";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { Logo } from "./Logo";

const LINKS: readonly { href: string; key: MessageKey }[] = [
  { href: "#generator", key: "nav.generator" },
  { href: "#combinations", key: "nav.combinations" },
  { href: "#favorites", key: "nav.favorites" },
  { href: "#settings", key: "nav.settings" },
];

export function SiteHeader() {
  const { t, state } = useMyNamae();
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLElement>("a, button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const favoritesCount = state.favorites.length;

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-washi/85 backdrop-blur-md">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-washi"
      >
        {t("nav.skip")}
      </a>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo label={t("nav.home")} />

        <nav aria-label={t("nav.label")} className="hidden md:block">
          <ul className="flex items-center gap-1">
            {LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="relative inline-flex min-h-10 items-center rounded-full px-3 text-sm text-muted transition-colors hover:bg-ivory hover:text-ink"
                >
                  {t(link.key)}
                  {link.href === "#favorites" && favoritesCount > 0 && (
                    <span
                      aria-hidden
                      className="ml-1.5 grid min-w-5 place-items-center rounded-full bg-sakura px-1 text-[0.7rem] font-semibold text-vermilion-ink"
                    >
                      {favoritesCount}
                    </span>
                  )}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden md:block">
          <LanguageSwitcher />
        </div>

        <button
          ref={toggleRef}
          type="button"
          className="grid size-11 place-items-center rounded-full border border-line bg-surface md:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? t("nav.closeMenu") : t("nav.openMenu")}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
        </button>
      </div>

      <div
        id="mobile-menu"
        ref={panelRef}
        hidden={!open}
        className="border-t border-line bg-washi px-4 pt-2 pb-5 md:hidden"
      >
        <nav aria-label={t("nav.label")}>
          <ul className="flex flex-col">
            {LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="flex min-h-12 items-center border-b border-line/70 font-display text-lg"
                >
                  {t(link.key)}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mt-4">
          <LanguageSwitcher size="md" full />
        </div>
      </div>
    </header>
  );
}

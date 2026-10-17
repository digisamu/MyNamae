"use client";

import { useMyNamae } from "@/components/app/MyNamaeProvider";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { LOCALES, type Locale } from "@/features/localization/i18n";

const SHORT: Record<Locale, string> = { en: "EN", ru: "RU", ja: "日本語" };

export function LanguageSwitcher({ size = "sm", full = false }: { size?: "sm" | "md"; full?: boolean }) {
  const { locale, setLocale, t } = useMyNamae();
  return (
    <SegmentedControl
      testId="language-switcher"
      label={t("language.label")}
      size={size}
      value={locale}
      onChange={setLocale}
      options={LOCALES.map((l) => ({
        value: l,
        // Native language names; the short codes are for the compact header.
        label: full ? t(`language.${l}`) : SHORT[l],
        lang: l,
      }))}
    />
  );
}

import { describe, expect, it } from "vitest";
import en from "@/messages/en";
import { LOCALES, messagesByLocale, translate } from "./i18n";

function leafPaths(node: unknown, prefix = ""): string[] {
  if (typeof node === "string") return [prefix];
  return Object.entries(node as Record<string, unknown>).flatMap(([k, v]) =>
    leafPaths(v, prefix ? `${prefix}.${k}` : k),
  );
}

describe("localization", () => {
  const englishKeys = leafPaths(en).sort();

  it.each(LOCALES)("%s defines every message key with non-empty text", (locale) => {
    const messages = messagesByLocale[locale];
    expect(leafPaths(messages).sort()).toEqual(englishKeys);
    for (const key of englishKeys) {
      expect(translate(locale, key as never).trim().length, key).toBeGreaterThan(0);
    }
  });

  it.each(LOCALES)("%s keeps every placeholder used in English", (locale) => {
    for (const key of englishKeys) {
      const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();
      expect(placeholders(translate(locale, key as never)), `${locale}:${key}`).toEqual(
        placeholders(translate("en", key as never)),
      );
    }
  });

  it("switches language for the same key", () => {
    expect(translate("en", "nav.favorites")).toBe("Favorites");
    expect(translate("ru", "nav.favorites")).toBe("Избранное");
    expect(translate("ja", "nav.favorites")).toBe("お気に入り");
  });

  it("interpolates variables", () => {
    expect(translate("en", "hero.dieChip", { n: 2 })).toBe("Die 2");
    expect(translate("ja", "hero.dieChip", { n: 3 })).toBe("サイコロ 3");
  });

  it("uses native names for language options in every locale", () => {
    for (const locale of LOCALES) {
      expect(translate(locale, "language.ru")).toBe("Русский");
      expect(translate(locale, "language.ja")).toBe("日本語");
    }
  });
});

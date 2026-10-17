import en, { type Messages } from "@/messages/en";
import ja from "@/messages/ja";
import ru from "@/messages/ru";

export const LOCALES = ["en", "ru", "ja"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

export const messagesByLocale: Readonly<Record<Locale, Messages>> = { en, ru, ja };

type Leaves<T, Prefix extends string = ""> = {
  [K in keyof T & string]: T[K] extends string ? `${Prefix}${K}` : Leaves<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

export type MessageKey = Leaves<Messages>;
export type MessageVars = Readonly<Record<string, string | number>>;

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

function lookup(messages: Messages, key: string): string | undefined {
  let node: unknown = messages;
  for (const part of key.split(".")) {
    if (typeof node !== "object" || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === "string" ? node : undefined;
}

/** Looks up a message, falling back to English, and fills {placeholders}. */
export function translate(locale: Locale, key: MessageKey, vars?: MessageVars): string {
  const template = lookup(messagesByLocale[locale], key) ?? lookup(en, key) ?? key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

export function formatDateTime(locale: Locale, timestamp: number): string {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(timestamp);
}

/** Locale-aware list joining, e.g. "Turkic, Arabic and Japanese" / "Turkic、Arabic、Japanese". */
export function formatList(locale: Locale, items: readonly string[]): string {
  return new Intl.ListFormat(locale, { style: "long", type: "conjunction" }).format(items);
}

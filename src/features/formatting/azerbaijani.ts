/** Azerbaijani-aware lower-casing: İ → i and I → ı (unlike the default Unicode mapping). */
export function azLowerCase(text: string): string {
  return text.replace(/İ/g, "i").replace(/I/g, "ı").toLowerCase();
}

/** Azerbaijani-aware upper-casing of the first letter only: i → İ and ı → I. */
export function azCapitalize(text: string): string {
  const first = text.charAt(0);
  const rest = text.slice(1);
  if (first === "i") return `İ${rest}`;
  if (first === "ı") return `I${rest}`;
  return first.toUpperCase() + rest;
}

/**
 * Fallback English-Latin mapping, based on common Azerbaijani passport romanization.
 * Applied character by character so that, e.g., c → j is never re-mapped by j → zh.
 */
export const EN_LATIN_FALLBACK: Readonly<Record<string, string>> = {
  Ə: "A", ə: "a",
  X: "Kh", x: "kh",
  Ş: "Sh", ş: "sh",
  Ç: "Ch", ç: "ch",
  Ğ: "Gh", ğ: "gh",
  Q: "G", q: "g",
  C: "J", c: "j",
  J: "Zh", j: "zh",
  I: "I", ı: "i",
  İ: "I", i: "i",
  Ö: "O", ö: "o",
  Ü: "U", ü: "u",
};

export function azLatinToEnLatinFallback(azLatin: string): string {
  return Array.from(azLatin, (ch) => EN_LATIN_FALLBACK[ch] ?? ch).join("");
}

/**
 * Letter mapping from Azerbaijani Latin to the Azerbaijani Cyrillic alphabet (1958–1991).
 * Runtime rendering uses curated azCyrillic values; this table is used by data validation to catch typos.
 */
const AZ_CYRILLIC: Readonly<Record<string, string>> = {
  a: "а", b: "б", c: "ҹ", ç: "ч", d: "д", e: "е", ə: "ә", f: "ф", g: "ҝ", ğ: "ғ",
  h: "һ", x: "х", ı: "ы", i: "и", j: "ж", k: "к", q: "г", l: "л", m: "м", n: "н",
  o: "о", ö: "ө", p: "п", r: "р", s: "с", ş: "ш", t: "т", u: "у", ü: "ү", v: "в",
  y: "ј", z: "з",
};

/** Returns null when a letter has no reviewed mapping. */
export function azLatinToCyrillicCandidate(azLatin: string): string | null {
  const lower = azLowerCase(azLatin);
  let out = "";
  for (const ch of lower) {
    const mapped = AZ_CYRILLIC[ch];
    if (mapped === undefined) return null;
    out += mapped;
  }
  return out.charAt(0).toUpperCase() + out.slice(1);
}

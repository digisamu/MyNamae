import type { NameComponent } from "@/types/names";
import { azLatinToEnLatinFallback } from "./azerbaijani";
import { stripMacrons } from "./japanese";

/** Allowed shape of a cross-cultural name: ASCII letters, with hyphen/apostrophe only between letters. */
export const EN_LATIN_PATTERN = /^[A-Za-z]+(?:['-][A-Za-z]+)*$/;

/** Strips diacritics and Arabic ʿayn/hamza marks from a Latin transliteration. */
export function stripTransliterationMarks(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[ʿʾʼ‘’`]/g, "")
    .normalize("NFC");
}

/** A Turkic component's curated enLatin, or the fallback mapping when none has been reviewed yet. */
export function turkicEnLatin(component: { azLatin: string; enLatin?: string }): string {
  return component.enLatin ?? azLatinToEnLatinFallback(component.azLatin);
}

/**
 * The single display-normalisation function for cross-cultural names (Rule D).
 * Every component of a mixed name passes through here; nothing else concatenates mixed output.
 */
export function toEnLatin(component: NameComponent): string {
  let raw: string;
  switch (component.culture) {
    case "turkic":
      raw = turkicEnLatin(component);
      break;
    case "japanese":
      raw = stripMacrons(component.hepburn);
      break;
    case "arabic":
      raw = component.latin;
      break;
  }
  // Last line of defence against malformed data: drop anything outside the allowed alphabet.
  return stripTransliterationMarks(raw).replace(/[^A-Za-z'-]/g, "");
}

/** Joins cross-cultural components, preserving each component's own capitalisation (AyNaka, ZaynKhan). */
export function joinEnLatin(components: readonly NameComponent[]): string {
  return components.map(toEnLatin).join("");
}

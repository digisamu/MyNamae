import type { FormattedName } from "@/features/formatting/formatName";

export interface PronunciationTarget {
  text: string;
  /** Voice language prefixes in order of preference. */
  langs: readonly string[];
}

/**
 * What to speak and in which language. The writing system already encodes the cultural composition,
 * so it decides the voice: Japanese reads the kana reading, Arabic the Arabic script, Turkic the
 * Azerbaijani spelling (Azerbaijani voice, else Turkish), and cross-cultural names use English.
 */
export function pronunciationTarget(f: FormattedName): PronunciationTarget {
  switch (f.latinSystem) {
    case "hepburn":
      return { text: f.scriptType === "kanji" && f.secondaryText ? f.secondaryText : f.primaryText, langs: ["ja"] };
    case "arabic-translit":
      return { text: f.secondaryText ?? f.primaryText, langs: ["ar"] };
    case "az-latin":
      return { text: f.primaryText, langs: ["az", "tr"] };
    case "en-latin":
      return { text: f.primaryText, langs: ["en"] };
  }
}

export interface VoiceLike {
  lang: string;
  name: string;
  localService?: boolean;
}

/** Picks the first installed voice matching the preferred languages, or null when none fits. */
export function pickVoice<T extends VoiceLike>(voices: readonly T[], langs: readonly string[]): T | null {
  for (const lang of langs) {
    const matches = voices.filter((v) => v.lang.toLowerCase().replace("_", "-").split("-")[0] === lang);
    if (matches.length > 0) return matches.find((v) => v.localService) ?? matches[0]!;
  }
  return null;
}

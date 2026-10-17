export const CULTURE_IDS = ["turkic", "arabic", "japanese"] as const;
export type CultureId = (typeof CULTURE_IDS)[number];

/** Which die a component may land on: first die, last die, or anywhere (including a middle die). */
export type ComponentPosition = "initial" | "final" | "any";

/** How much human review a data entry has had. */
export type Confidence = "verified" | "reviewed" | "needs-review";

export type ReviewFlag =
  /** No curated enLatin spelling; the passport-style fallback mapping is used until reviewed. */
  | "enLatin-fallback";

export type Gender = "m" | "f" | "u";

interface ComponentBase {
  id: string;
  position: ComponentPosition;
  confidence: Confidence;
  /** Structural tags used by a culture's pair rules (e.g. Arabic "laqab", "din"). */
  tags?: readonly string[];
  /** Bound components cannot stand next to another culture's component (e.g. Arabic "Abd al-"). */
  bound?: boolean;
  /** Allows the same component on adjacent dice. */
  reduplicationAllowed?: boolean;
  note?: string;
}

export interface TurkicComponent extends ComponentBase {
  culture: "turkic";
  /** Azerbaijani Latin orthography, e.g. "Bəy". */
  azLatin: string;
  /** Azerbaijani Cyrillic (1958–1991 alphabet), only when a reviewed mapping exists. */
  azCyrillic?: string;
  /** Curated plain ASCII spelling for cross-cultural names, e.g. "Bey". */
  enLatin?: string;
  reviewFlags?: readonly ReviewFlag[];
}

export interface ArabicComponent extends ComponentBase {
  culture: "arabic";
  /** Simplified ASCII Latin spelling, e.g. "Abd al-" or "Zayn". */
  latin: string;
  /** Scholarly transliteration with diacritics, e.g. "ʿAbd al-". */
  translit: string;
  arabic: string;
  gender?: Gender;
}

export interface JapaneseComponent extends ComponentBase {
  culture: "japanese";
  hiragana: string;
  /** Modified Hepburn, capitalised, macrons for long vowels, e.g. "Yū". */
  hepburn: string;
}

export type NameComponent = TurkicComponent | ArabicComponent | JapaneseComponent;

interface CuratedNameBase {
  id: string;
  /**
   * Component ids, one per die, split only at reviewed morpheme boundaries.
   * `null` means the name cannot be meaningfully segmented and is excluded from dice-based established mode.
   */
  segments: readonly string[] | null;
  exclusionReason?: "single-morpheme" | "non-compositional-reading";
  confidence: Confidence;
  gender?: Gender;
  /** Short English gloss, only where well attested. */
  meaning?: string;
}

export interface TurkicName extends CuratedNameBase {
  culture: "turkic";
  azLatin: string;
  azCyrillic?: string;
  enLatin?: string;
  reviewFlags?: readonly ReviewFlag[];
}

export interface ArabicName extends CuratedNameBase {
  culture: "arabic";
  /** Conventional Latin spelling shown as the primary line, e.g. "Abdullah". */
  latin: string;
  translit: string;
  arabic: string;
  /** The conventional Latin spelling intentionally differs from the mechanical join (e.g. Fadlallah). */
  conventionalLatin?: boolean;
}

export interface JapaneseName extends CuratedNameBase {
  culture: "japanese";
  /** Reviewed kanji spelling. Absent means the name is shown in kana only. */
  kanji?: string;
  hiragana: string;
  hepburn: string;
  kind: "given" | "surname";
}

export type CuratedName = TurkicName | ArabicName | JapaneseName;

export type JoinRule = "turkic-concat" | "japanese-kana" | "arabic-structural";

export interface PairRule {
  left: string;
  right: string;
  join: "concat" | "ullah" | "al-din" | "nasab";
}

export interface CultureDefinition {
  id: CultureId;
  joinRule: JoinRule;
  /** When present, two same-culture neighbours must match one of these rules. */
  pairRules?: readonly PairRule[];
  /** Component ids shown on the culture card. */
  previewComponentIds: readonly string[];
  components: readonly NameComponent[];
  names: readonly CuratedName[];
}

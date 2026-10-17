import { defaultRegistry, type CultureRegistry } from "@/data/cultures";
import type { NameResult } from "@/types/generation";
import type { CultureId, NameComponent } from "@/types/names";
import { composeName } from "./compose";
import { toEnLatin, turkicEnLatin } from "./enLatin";

export type LatinSystem = "az-latin" | "hepburn" | "arabic-translit" | "en-latin";
export type ScriptType = "kanji" | "hiragana" | "az-latin" | "arabic-latin" | "en-latin";
export type SecondaryScript = "hiragana" | "az-cyrillic" | "arabic";
export type LinguisticStatus = "established" | "creative" | "creative-matched";
export type TextDirection = "ltr" | "rtl";

export interface NativeText {
  text: string;
  lang: string;
  dir: TextDirection;
}

export interface FormattedComponent {
  culture: CultureId;
  componentId: string;
  /** The component in its own orthography (azLatin, Hepburn, Arabic Latin). Metadata only. */
  label: string;
  native: NativeText | null;
}

export interface FormattedName {
  primaryText: string;
  primaryLang: string;
  scriptType: ScriptType;
  secondaryText: string | null;
  secondaryLang: string | null;
  secondaryScript: SecondaryScript | null;
  /** Set when the culture normally shows a second script but no reviewed form exists. */
  secondaryUnavailable: SecondaryScript | null;
  /** Direction of the secondary line; the primary line is always left-to-right. */
  textDirection: TextDirection;
  romanization: string | null;
  latinSystem: LatinSystem;
  cultureLabels: readonly CultureId[];
  linguisticStatus: LinguisticStatus;
  components: readonly FormattedComponent[];
  meaning: string | null;
}

export function formatComponent(component: NameComponent): FormattedComponent {
  switch (component.culture) {
    case "turkic":
      return {
        culture: "turkic",
        componentId: component.id,
        label: component.azLatin,
        native: component.azCyrillic
          ? { text: component.azCyrillic, lang: "az-Cyrl", dir: "ltr" }
          : null,
      };
    case "japanese":
      return {
        culture: "japanese",
        componentId: component.id,
        label: component.hepburn,
        native: { text: component.hiragana, lang: "ja", dir: "ltr" },
      };
    case "arabic":
      return {
        culture: "arabic",
        componentId: component.id,
        label: component.latin,
        native: { text: component.arabic, lang: "ar", dir: "rtl" },
      };
  }
}

export interface FaceLabel {
  primary: string;
  primaryLang: string;
  secondary: NativeText | null;
}

/**
 * How a component is painted on a die face. In a mixed configuration faces show the same English Latin
 * spelling that will appear in the name; in a single-culture roll they show the culture's own forms.
 */
export function formatFaceLabel(component: NameComponent, crossCultural: boolean): FaceLabel {
  if (crossCultural) return { primary: toEnLatin(component), primaryLang: "en", secondary: null };
  switch (component.culture) {
    case "turkic":
      return { primary: component.azLatin, primaryLang: "az", secondary: null };
    case "japanese":
      return {
        primary: component.hiragana,
        primaryLang: "ja",
        secondary: { text: component.hepburn, lang: "ja-Latn", dir: "ltr" },
      };
    case "arabic":
      return {
        primary: component.latin,
        primaryLang: "ar-Latn",
        secondary: { text: component.arabic, lang: "ar", dir: "rtl" },
      };
  }
}

function statusOf(result: Pick<NameResult, "explanation">): LinguisticStatus {
  if (result.explanation === "established") return "established";
  if (result.explanation === "creative-matched") return "creative-matched";
  return "creative";
}

/**
 * Deterministic writing-system selection (Rules A–E). The script depends only on the cultural composition
 * of the name, never on the interface language. Returns null if the result references unknown data.
 */
export function formatGeneratedName(
  result: Pick<NameResult, "components" | "curatedNameId" | "explanation">,
  registry: CultureRegistry = defaultRegistry,
): FormattedName | null {
  const components: NameComponent[] = [];
  for (const ref of result.components) {
    const component = registry.componentById.get(ref.componentId);
    if (!component || component.culture !== ref.culture) return null;
    components.push(component);
  }
  const composed = composeName(components, registry);
  if (!composed) return null;

  const curated = result.curatedNameId ? registry.nameById.get(result.curatedNameId) : undefined;
  if (result.curatedNameId && !curated) return null;

  const cultureLabels = [...new Set(components.map((c) => c.culture))];
  const base = {
    cultureLabels,
    linguisticStatus: statusOf(result),
    components: components.map(formatComponent),
    meaning: curated?.meaning ?? null,
    secondaryUnavailable: null,
    textDirection: "ltr" as TextDirection,
  };

  switch (composed.kind) {
    case "cross":
      // Rule D: plain English Latin only, no native script anywhere in the name.
      return {
        ...base,
        primaryText: composed.enLatin,
        primaryLang: "en",
        scriptType: "en-latin",
        secondaryText: null,
        secondaryLang: null,
        secondaryScript: null,
        romanization: null,
        latinSystem: "en-latin",
      };

    case "japanese": {
      // Rule A: kanji only from a curated entry; otherwise hiragana as a creative fallback.
      const name = curated?.culture === "japanese" ? curated : undefined;
      const hiragana = name?.hiragana ?? composed.hiragana;
      const hepburn = name?.hepburn ?? composed.hepburn;
      if (name?.kanji) {
        return {
          ...base,
          primaryText: name.kanji,
          primaryLang: "ja",
          scriptType: "kanji",
          secondaryText: hiragana,
          secondaryLang: "ja",
          secondaryScript: "hiragana",
          romanization: hepburn,
          latinSystem: "hepburn",
        };
      }
      return {
        ...base,
        primaryText: hiragana,
        primaryLang: "ja",
        scriptType: "hiragana",
        secondaryText: null,
        secondaryLang: null,
        secondaryScript: null,
        romanization: hepburn,
        latinSystem: "hepburn",
      };
    }

    case "turkic": {
      // Rule B: Azerbaijani Latin, with Azerbaijani Cyrillic beneath when a reviewed form exists.
      const name = curated?.culture === "turkic" ? curated : undefined;
      const cyrillic = name ? (name.azCyrillic ?? null) : composed.azCyrillic;
      return {
        ...base,
        primaryText: name?.azLatin ?? composed.azLatin,
        primaryLang: "az",
        scriptType: "az-latin",
        secondaryText: cyrillic,
        secondaryLang: cyrillic ? "az-Cyrl" : null,
        secondaryScript: cyrillic ? "az-cyrillic" : null,
        secondaryUnavailable: cyrillic ? null : "az-cyrillic",
        romanization: name ? turkicEnLatin(name) : composed.enLatin,
        latinSystem: "az-latin",
      };
    }

    case "arabic": {
      // Rule C: Latin transliteration, Arabic script beneath (right-to-left).
      const name = curated?.culture === "arabic" ? curated : undefined;
      return {
        ...base,
        primaryText: name?.latin ?? composed.latin,
        primaryLang: "ar-Latn",
        scriptType: "arabic-latin",
        secondaryText: name?.arabic ?? composed.arabic,
        secondaryLang: "ar",
        secondaryScript: "arabic",
        textDirection: "rtl",
        romanization: name?.translit ?? composed.translit,
        latinSystem: "arabic-translit",
      };
    }
  }
}

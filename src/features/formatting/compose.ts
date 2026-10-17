import type { CultureRegistry } from "@/data/cultures";
import type {
  ArabicComponent,
  CultureDefinition,
  CuratedName,
  JapaneseComponent,
  NameComponent,
  PairRule,
  TurkicComponent,
} from "@/types/names";
import { azCapitalize, azLowerCase } from "./azerbaijani";
import { joinEnLatin, turkicEnLatin } from "./enLatin";
import { joinHepburn } from "./japanese";

/** The joined, culture-specific forms of a sequence of components (before any curated lookup). */
export type ComposedName =
  | { kind: "turkic"; azLatin: string; azCyrillic: string | null; enLatin: string }
  | { kind: "japanese"; hiragana: string; hepburn: string }
  | { kind: "arabic"; latin: string; translit: string; arabic: string; join: PairRule["join"] }
  | { kind: "cross"; enLatin: string };

function hasTag(component: NameComponent, tag: string): boolean {
  return component.tags?.includes(tag) ?? false;
}

/** The first pair rule of a culture matching two neighbouring components, if any. */
export function findPairRule(
  culture: CultureDefinition,
  left: NameComponent,
  right: NameComponent,
): PairRule | undefined {
  return culture.pairRules?.find((rule) => hasTag(left, rule.left) && hasTag(right, rule.right));
}

function composeTurkic(components: readonly TurkicComponent[]): ComposedName {
  const join = (parts: readonly string[]) => azCapitalize(parts.map(azLowerCase).join(""));
  const cyrillicParts = components.map((c) => c.azCyrillic);
  const azCyrillic = cyrillicParts.every((p): p is string => typeof p === "string")
    ? (() => {
        const lower = cyrillicParts.join("").toLowerCase();
        return lower.charAt(0).toUpperCase() + lower.slice(1);
      })()
    : null;
  const en = components.map(turkicEnLatin).join("").toLowerCase();
  return {
    kind: "turkic",
    azLatin: join(components.map((c) => c.azLatin)),
    azCyrillic,
    enLatin: en.charAt(0).toUpperCase() + en.slice(1),
  };
}

function composeJapanese(components: readonly JapaneseComponent[]): ComposedName {
  let hepburn = components[0]!.hepburn;
  let kana = components[0]!.hiragana;
  for (const next of components.slice(1)) {
    hepburn = joinHepburn(hepburn, kana, next.hepburn);
    kana += next.hiragana;
  }
  return { kind: "japanese", hiragana: kana, hepburn };
}

function composeArabic(
  culture: CultureDefinition,
  components: readonly ArabicComponent[],
): ComposedName | null {
  if (components.length !== 2) return null;
  const [left, right] = components as [ArabicComponent, ArabicComponent];
  const rule = findPairRule(culture, left, right);
  if (!rule) return null;
  switch (rule.join) {
    case "concat":
      return {
        kind: "arabic",
        join: rule.join,
        latin: left.latin + right.latin,
        translit: left.translit + right.translit,
        arabic: left.arabic + right.arabic,
      };
    case "ullah":
      return {
        kind: "arabic",
        join: rule.join,
        latin: `${left.latin}ullah`,
        translit: `${left.translit} ${right.translit}`,
        arabic: `${left.arabic} ${right.arabic}`,
      };
    case "al-din":
      return {
        kind: "arabic",
        join: rule.join,
        latin: `${left.latin} al-${right.latin}`,
        translit: `${left.translit} al-${right.translit}`,
        arabic: `${left.arabic} ال${right.arabic}`,
      };
    case "nasab":
      return {
        kind: "arabic",
        join: rule.join,
        latin: `${left.latin} ${right.latin}`,
        translit: `${left.translit} ${right.translit}`,
        arabic: `${left.arabic} ${right.arabic}`,
      };
  }
}

/**
 * Joins components according to their cultural composition:
 * one culture → that culture's joining rule; several cultures → plain English Latin.
 * Returns null when the components do not form a valid structure (e.g. an Arabic pair without a rule).
 */
export function composeName(
  components: readonly NameComponent[],
  registry: CultureRegistry,
): ComposedName | null {
  if (components.length < 2) return null;
  const cultures = new Set(components.map((c) => c.culture));
  if (cultures.size > 1) return { kind: "cross", enLatin: joinEnLatin(components) };

  const first = components[0]!;
  switch (first.culture) {
    case "turkic":
      return composeTurkic(components as readonly TurkicComponent[]);
    case "japanese":
      return composeJapanese(components as readonly JapaneseComponent[]);
    case "arabic":
      return composeArabic(registry.cultures.arabic, components as readonly ArabicComponent[]);
  }
}

/** Finds a curated single-culture name spelled identically to a composed name. */
export function findCuratedMatch(
  composed: ComposedName,
  registry: CultureRegistry,
): CuratedName | undefined {
  switch (composed.kind) {
    case "cross":
      return undefined;
    case "turkic": {
      const key = azLowerCase(composed.azLatin);
      return registry.cultures.turkic.names.find(
        (n) => n.culture === "turkic" && azLowerCase(n.azLatin) === key,
      );
    }
    case "japanese":
      return registry.cultures.japanese.names.find(
        (n) => n.culture === "japanese" && n.hiragana === composed.hiragana,
      );
    case "arabic":
      return registry.cultures.arabic.names.find(
        (n) => n.culture === "arabic" && n.arabic === composed.arabic,
      );
  }
}

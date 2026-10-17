import type { CultureRegistry } from "@/data/cultures";
import { azLatinToCyrillicCandidate, azLowerCase } from "@/features/formatting/azerbaijani";
import { composeName } from "@/features/formatting/compose";
import { kanaToHepburn } from "@/features/formatting/japanese";
import { fitsSlot, slotFor } from "@/features/generation/generate";
import type { CultureDefinition, CuratedName, NameComponent } from "@/types/names";

const POSITIONS = new Set(["initial", "final", "any"]);
const CONFIDENCE = new Set(["verified", "reviewed", "needs-review"]);
const ASCII_WORD = /^[A-Za-z]+$/;
const HIRAGANA = /^[ぁ-ゖー]+$/;
const KANJI = /^[一-鿿々]+$/;
const ARABIC = /^[؀-ۿ ]+$/;

function checkComponent(c: NameComponent): string[] {
  const issues: string[] = [];
  const at = `component ${c.id}`;
  if (!c.id) issues.push("component without id");
  if (!POSITIONS.has(c.position)) issues.push(`${at}: invalid position "${String(c.position)}"`);
  if (!CONFIDENCE.has(c.confidence)) issues.push(`${at}: invalid confidence`);
  switch (c.culture) {
    case "turkic": {
      if (!c.azLatin) issues.push(`${at}: missing azLatin`);
      if (c.enLatin !== undefined && !ASCII_WORD.test(c.enLatin)) issues.push(`${at}: enLatin is not ASCII`);
      if (c.enLatin === undefined && !c.reviewFlags?.includes("enLatin-fallback")) {
        issues.push(`${at}: missing enLatin and not flagged for review`);
      }
      if (c.azCyrillic !== undefined && c.azCyrillic !== azLatinToCyrillicCandidate(c.azLatin)) {
        issues.push(`${at}: azCyrillic "${c.azCyrillic}" disagrees with the letter mapping`);
      }
      break;
    }
    case "arabic": {
      if (!c.latin || !c.translit || !c.arabic) issues.push(`${at}: missing latin/translit/arabic`);
      if (!ARABIC.test(c.arabic)) issues.push(`${at}: arabic field contains non-Arabic characters`);
      if (!c.bound && !ASCII_WORD.test(c.latin)) issues.push(`${at}: unbound latin must be plain ASCII`);
      break;
    }
    case "japanese": {
      if (!HIRAGANA.test(c.hiragana)) issues.push(`${at}: hiragana field is not hiragana`);
      if (kanaToHepburn(c.hiragana) !== c.hepburn.toLowerCase()) {
        issues.push(`${at}: hepburn "${c.hepburn}" does not match reading ${c.hiragana}`);
      }
      break;
    }
  }
  return issues;
}

function checkName(name: CuratedName, def: CultureDefinition, registry: CultureRegistry): string[] {
  const issues: string[] = [];
  const at = `name ${name.id}`;
  if (!CONFIDENCE.has(name.confidence)) issues.push(`${at}: invalid confidence`);

  if (name.culture === "turkic") {
    if (name.enLatin === undefined && !name.reviewFlags?.includes("enLatin-fallback")) {
      issues.push(`${at}: missing enLatin and not flagged for review`);
    }
    if (name.enLatin !== undefined && !ASCII_WORD.test(name.enLatin)) issues.push(`${at}: enLatin is not ASCII`);
    if (name.azCyrillic !== undefined && name.azCyrillic !== azLatinToCyrillicCandidate(name.azLatin)) {
      issues.push(`${at}: azCyrillic disagrees with the letter mapping`);
    }
  }
  if (name.culture === "japanese") {
    if (name.kanji !== undefined && !KANJI.test(name.kanji)) issues.push(`${at}: kanji field is not kanji`);
    if (!HIRAGANA.test(name.hiragana)) issues.push(`${at}: hiragana field is not hiragana`);
  }
  if (name.culture === "arabic" && !ARABIC.test(name.arabic)) issues.push(`${at}: arabic field is not Arabic`);

  if (name.segments === null) {
    if (!name.exclusionReason) issues.push(`${at}: unsegmented name needs an exclusionReason`);
    return issues;
  }
  if (name.segments.length < 2 || name.segments.length > 3) {
    issues.push(`${at}: segmentation must have 2–3 parts`);
    return issues;
  }
  const parts: NameComponent[] = [];
  name.segments.forEach((id, i) => {
    const component = registry.componentById.get(id);
    if (!component) {
      issues.push(`${at}: unknown segment ${id}`);
      return;
    }
    if (component.culture !== def.id) issues.push(`${at}: segment ${id} belongs to another culture`);
    if (!fitsSlot(component, slotFor(i, name.segments!.length))) {
      issues.push(`${at}: segment ${id} cannot occupy die ${i + 1}`);
    }
    parts.push(component);
  });
  if (parts.length !== name.segments.length) return issues;

  const composed = composeName(parts, registry);
  if (!composed) {
    issues.push(`${at}: segments do not form a valid structure`);
    return issues;
  }
  if (composed.kind === "turkic" && name.culture === "turkic") {
    if (azLowerCase(composed.azLatin) !== azLowerCase(name.azLatin)) {
      issues.push(`${at}: segments join to ${composed.azLatin}, not ${name.azLatin}`);
    }
  } else if (composed.kind === "japanese" && name.culture === "japanese") {
    if (composed.hiragana !== name.hiragana) issues.push(`${at}: segment readings join to ${composed.hiragana}`);
    if (composed.hepburn !== name.hepburn) issues.push(`${at}: segment Hepburn joins to ${composed.hepburn}`);
  } else if (composed.kind === "arabic" && name.culture === "arabic") {
    if (composed.arabic !== name.arabic) issues.push(`${at}: segments join to ${composed.arabic}`);
    if (composed.translit !== name.translit) issues.push(`${at}: segments transliterate to ${composed.translit}`);
    if (composed.latin !== name.latin && !name.conventionalLatin) {
      issues.push(`${at}: segments spell ${composed.latin}; mark conventionalLatin if intended`);
    }
  } else {
    issues.push(`${at}: composed kind ${composed.kind} does not match culture`);
  }
  return issues;
}

/** Returns a list of human-readable problems; an empty list means the dictionaries are well formed. */
export function validateRegistry(registry: CultureRegistry): string[] {
  const issues: string[] = [];
  const seen = new Set<string>();
  for (const def of Object.values(registry.cultures)) {
    for (const entry of [...def.components, ...def.names]) {
      if (seen.has(entry.id)) issues.push(`duplicate id ${entry.id}`);
      seen.add(entry.id);
      if (entry.culture !== def.id) issues.push(`${entry.id} is filed under ${def.id}`);
    }
    for (const component of def.components) issues.push(...checkComponent(component));
    for (const name of def.names) issues.push(...checkName(name, def, registry));
    for (const id of def.previewComponentIds) {
      if (!registry.componentById.has(id)) issues.push(`${def.id}: unknown preview component ${id}`);
    }
  }
  const readings = registry.cultures.japanese.names.map((n) => (n.culture === "japanese" ? n.hiragana : ""));
  const dupes = readings.filter((r, i) => readings.indexOf(r) !== i);
  if (dupes.length > 0) issues.push(`duplicate Japanese readings: ${dupes.join(", ")}`);
  return issues;
}

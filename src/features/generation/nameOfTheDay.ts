import { defaultRegistry, type CultureRegistry } from "@/data/cultures";
import { formatGeneratedName } from "@/features/formatting/formatName";
import type { NameResult } from "@/types/generation";
import type { CuratedName } from "@/types/names";

/** Calendar date as YYYY-MM-DD in UTC, so everyone sees the same name on the same day. */
export function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function hash(text: string): number {
  let h = 2166136261;
  for (const ch of text) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Curated, segmented names from every culture in a stable order. */
export function dailyCandidates(registry: CultureRegistry = defaultRegistry): CuratedName[] {
  return Object.values(registry.cultures)
    .flatMap((c) => c.names)
    .filter((n) => n.segments !== null)
    .sort((a, b) => a.id.localeCompare(b.id));
}

/** Deterministic daily pick, expressed as an established result so it formats like any roll. */
export function nameOfTheDay(date: Date, registry: CultureRegistry = defaultRegistry): NameResult {
  const key = dayKey(date);
  const candidates = dailyCandidates(registry);
  const name = candidates[hash(key) % candidates.length]!;
  const components = name.segments!.map((id) => ({ culture: name.culture, componentId: id }));
  const draft = { components, curatedNameId: name.id, explanation: "established" as const };
  return {
    id: `daily-${key}`,
    createdAt: 0,
    mode: "established",
    requestedMode: "established",
    dice: components.map(() => name.culture),
    components,
    cultures: [name.culture],
    curatedNameId: name.id,
    displayName: formatGeneratedName(draft, registry)?.primaryText ?? name.id,
    explanation: "established",
  };
}

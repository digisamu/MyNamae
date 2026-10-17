import { defaultRegistry, type CultureRegistry } from "@/data/cultures";
import { composeName, findCuratedMatch } from "@/features/formatting/compose";
import { formatGeneratedName } from "@/features/formatting/formatName";
import { isCrossCultural, uniqueCultures, validateDiceConfig } from "@/features/generation/config";
import { buildFaces, eligibleComponents } from "@/features/generation/generate";
import { createSeededRandom } from "@/lib/random";
import type { NameResult, RollOutcome } from "@/types/generation";
import type { CultureId } from "@/types/names";

/** URL parameter names. Only dictionary component ids and the mode are encoded — never personal data. */
export const SHARE_PARAM = "r";
export const SHARE_MODE_PARAM = "m";

export function shareParams(result: Pick<NameResult, "components" | "mode">): URLSearchParams {
  const params = new URLSearchParams();
  params.set(SHARE_PARAM, result.components.map((c) => c.componentId).join("."));
  params.set(SHARE_MODE_PARAM, result.mode === "established" ? "e" : "c");
  return params;
}

export function shareUrl(result: Pick<NameResult, "components" | "mode">, origin: string): string {
  return `${origin}/?${shareParams(result).toString()}`;
}

/** Rebuilds a result from share parameters, or null when they do not describe a valid name. */
export function resultFromShare(
  ids: string | null | undefined,
  modeParam: string | null | undefined,
  registry: CultureRegistry = defaultRegistry,
): NameResult | null {
  if (!ids || ids.length > 200) return null;
  const components = ids.split(".").map((id) => registry.componentById.get(id));
  if (components.some((c) => c === undefined)) return null;
  const parts = components as NonNullable<(typeof components)[number]>[];
  const dice = parts.map((c) => c.culture) as CultureId[];
  if (!validateDiceConfig(dice).ok) return null;
  // Every part must be a legal outcome for its die, exactly as if it had been rolled.
  if (!parts.every((c, i) => eligibleComponents(dice, i, registry).some((e) => e.id === c.id))) return null;
  const composed = composeName(parts, registry);
  if (!composed) return null;

  const segmentKey = parts.map((c) => c.id).join("|");
  const established =
    modeParam === "e" && !isCrossCultural(dice)
      ? registry.cultures[dice[0]!].names.find((n) => n.segments?.join("|") === segmentKey)
      : undefined;
  const matched = established ?? (isCrossCultural(dice) ? undefined : findCuratedMatch(composed, registry));
  const explanation = established ? "established" : matched ? "creative-matched" : "creative";
  const refs = parts.map((c) => ({ culture: c.culture, componentId: c.id }));
  const formatted = formatGeneratedName({ components: refs, curatedNameId: matched?.id, explanation }, registry);
  if (!formatted) return null;

  return {
    id: `shared-${segmentKey}`,
    createdAt: 0,
    mode: established ? "established" : "creative",
    requestedMode: established ? "established" : "creative",
    dice,
    components: refs,
    cultures: uniqueCultures(dice),
    ...(matched ? { curatedNameId: matched.id } : {}),
    displayName: formatted.primaryText,
    explanation,
  };
}

/** Dice that show the shared result, with faces chosen reproducibly from the component ids. */
export function rollForResult(result: NameResult, registry: CultureRegistry = defaultRegistry): RollOutcome {
  const seed = [...result.id].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 17);
  const rng = createSeededRandom(seed);
  return {
    result,
    dice: result.components.map((ref, index) => {
      const component = registry.componentById.get(ref.componentId)!;
      const { faces, faceIndex } = buildFaces(component, eligibleComponents(result.dice, index, registry), rng);
      return { index, culture: ref.culture, componentId: ref.componentId, faces, faceIndex };
    }),
  };
}

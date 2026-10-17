import { defaultRegistry, type CultureRegistry } from "@/data/cultures";
import { composeName, findCuratedMatch, findPairRule } from "@/features/formatting/compose";
import { formatGeneratedName } from "@/features/formatting/formatName";
import { defaultRandom, pickOne, randomInt, shuffle, type RandomSource } from "@/lib/random";
import {
  FACES_PER_DIE,
  type DieOutcome,
  type GenerationMode,
  type NameResult,
  type ResultExplanation,
  type RollOutcome,
} from "@/types/generation";
import type { CultureId, CuratedName, NameComponent } from "@/types/names";
import { isCrossCultural, uniqueCultures, validateDiceConfig, type ConfigIssue } from "./config";

export interface GenerationRequest {
  dice: readonly CultureId[];
  mode: GenerationMode;
}

export interface GenerationOptions {
  rng?: RandomSource;
  registry?: CultureRegistry;
  /** Signatures of recent results to avoid where practical. */
  avoid?: ReadonlySet<string>;
  now?: () => number;
  createId?: () => string;
  /**
   * Dice kept from the previous roll, by index. A locked die keeps its component, faces and orientation;
   * only unlocked dice are rerolled. Ignored when the locked culture no longer matches that die.
   */
  locked?: readonly (DieOutcome | null | undefined)[];
  /** Established-mode filter on curated gender metadata; creative names are never filtered by gender. */
  style?: "any" | "f" | "m" | "u";
}

export type GenerationResult =
  | { ok: true; outcome: RollOutcome }
  | { ok: false; reason: ConfigIssue | "no-valid-combination" };

const AVOID_ATTEMPTS = 12;

type Slot = "first" | "middle" | "last";

export function slotFor(index: number, count: number): Slot {
  if (index === 0) return "first";
  if (index === count - 1) return "last";
  return "middle";
}

export function fitsSlot(component: NameComponent, slot: Slot): boolean {
  switch (slot) {
    case "first":
      return component.position === "initial" || component.position === "any";
    case "last":
      return component.position === "final" || component.position === "any";
    case "middle":
      return component.position === "any";
  }
}

/** Components a given die may land on: its culture, its position, and (for mixed names) unbound only. */
export function eligibleComponents(
  dice: readonly CultureId[],
  index: number,
  registry: CultureRegistry = defaultRegistry,
): NameComponent[] {
  const culture = registry.cultures[dice[index]!];
  if (!culture) return [];
  const slot = slotFor(index, dice.length);
  const cross = isCrossCultural(dice);
  return culture.components.filter((c) => fitsSlot(c, slot) && !(cross && c.bound));
}

export function canAdjoin(
  left: NameComponent,
  right: NameComponent,
  cross: boolean,
  registry: CultureRegistry = defaultRegistry,
): boolean {
  if (left.id === right.id && !(left.reduplicationAllowed && right.reduplicationAllowed)) return false;
  if (cross) return true;
  const culture = registry.cultures[left.culture];
  if (!culture.pairRules) return true;
  return findPairRule(culture, left, right) !== undefined;
}

export function signatureOf(componentIds: readonly string[]): string {
  return componentIds.join("|");
}

/** Randomised depth-first search over the dice pools, so every valid combination stays reachable. */
function searchCombination(
  pools: readonly (readonly NameComponent[])[],
  cross: boolean,
  rng: RandomSource,
  registry: CultureRegistry,
): NameComponent[] | null {
  const chosen: NameComponent[] = [];
  const visit = (i: number): boolean => {
    if (i === pools.length) return true;
    for (const candidate of shuffle(rng, pools[i]!)) {
      if (i > 0 && !canAdjoin(chosen[i - 1]!, candidate, cross, registry)) continue;
      chosen[i] = candidate;
      if (visit(i + 1)) return true;
    }
    return false;
  };
  return visit(0) ? chosen : null;
}

/** Curated names usable in dice-based established mode for a single-culture configuration. */
export function establishedCandidates(
  dice: readonly CultureId[],
  registry: CultureRegistry = defaultRegistry,
  style: GenerationOptions["style"] = "any",
): CuratedName[] {
  if (isCrossCultural(dice)) return [];
  const culture = registry.cultures[dice[0]!];
  return culture.names.filter(
    (n) =>
      (style === "any" || n.gender === style) &&
      n.segments !== null &&
      n.segments.length === dice.length &&
      n.segments.every((id, i) => {
        const component = registry.componentById.get(id);
        return component !== undefined && fitsSlot(component, slotFor(i, dice.length));
      }),
  );
}

/** Six faces: the selected component plus five other valid components for that die. */
export function buildFaces(
  selected: NameComponent,
  pool: readonly NameComponent[],
  rng: RandomSource,
): { faces: string[]; faceIndex: number } {
  const others = shuffle(
    rng,
    pool.filter((c) => c.id !== selected.id),
  ).map((c) => c.id);
  const fillers: string[] = [];
  for (let i = 0; fillers.length < FACES_PER_DIE - 1; i++) {
    fillers.push(others.length > 0 ? others[i % others.length]! : selected.id);
  }
  const faceIndex = randomInt(rng, FACES_PER_DIE);
  const faces = [...fillers];
  faces.splice(faceIndex, 0, selected.id);
  return { faces, faceIndex };
}

function defaultId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `nf-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Rolls a name. The dice outcomes are decided first; the name is always derived from them,
 * so the visible faces and the displayed result can never disagree.
 */
export function generateName(
  request: GenerationRequest,
  options: GenerationOptions = {},
): GenerationResult {
  const rng = options.rng ?? defaultRandom;
  const registry = options.registry ?? defaultRegistry;
  const avoid = options.avoid ?? new Set<string>();
  const validation = validateDiceConfig(request.dice);
  if (!validation.ok) return { ok: false, reason: validation.issue };

  const dice = request.dice;
  const cross = isCrossCultural(dice);
  const locked = dice.map((culture, i) => {
    const die = options.locked?.[i];
    if (!die) return null;
    const component = registry.componentById.get(die.componentId);
    const usable =
      component !== undefined &&
      die.culture === culture &&
      fitsSlot(component, slotFor(i, dice.length)) &&
      !(cross && component.bound);
    return usable ? die : null;
  });
  const fullPools = dice.map((_, i) => eligibleComponents(dice, i, registry));
  const pools = fullPools.map((pool, i) => {
    const die = locked[i];
    return die ? [registry.componentById.get(die.componentId)!] : pool;
  });

  let selection: NameComponent[] | null = null;
  let curated: CuratedName | undefined;
  let explanation: ResultExplanation = "creative";
  let mode: GenerationMode = "creative";

  if (request.mode === "established") {
    if (cross) {
      explanation = "established-unavailable-mixed";
    } else {
      const candidates = establishedCandidates(dice, registry, options.style).filter((n) =>
        locked.every((die, i) => !die || n.segments![i] === die.componentId),
      );
      const fresh = candidates.filter((n) => !avoid.has(signatureOf(n.segments!)));
      const name = pickOne(rng, fresh.length > 0 ? fresh : candidates);
      if (name) {
        curated = name;
        selection = name.segments!.map((id) => registry.componentById.get(id)!);
        explanation = "established";
        mode = "established";
      }
    }
  }

  if (!selection) {
    for (let attempt = 0; attempt < AVOID_ATTEMPTS; attempt++) {
      const candidate = searchCombination(pools, cross, rng, registry);
      if (!candidate) break;
      selection = candidate;
      if (!avoid.has(signatureOf(candidate.map((c) => c.id)))) break;
    }
    if (!selection) return { ok: false, reason: "no-valid-combination" };
    const composed = composeName(selection, registry);
    if (!composed) return { ok: false, reason: "no-valid-combination" };
    curated = cross ? undefined : findCuratedMatch(composed, registry);
    if (curated && explanation === "creative") explanation = "creative-matched";
  }

  const components = selection.map((c) => ({ culture: c.culture, componentId: c.id }));
  const draft = { components, curatedNameId: curated?.id, explanation };
  const formatted = formatGeneratedName(draft, registry);
  if (!formatted) return { ok: false, reason: "no-valid-combination" };

  const result: NameResult = {
    id: (options.createId ?? defaultId)(),
    createdAt: (options.now ?? Date.now)(),
    mode,
    requestedMode: request.mode,
    dice: [...dice],
    components,
    cultures: uniqueCultures(dice),
    ...(curated ? { curatedNameId: curated.id } : {}),
    displayName: formatted.primaryText,
    explanation,
  };

  const dieOutcomes: DieOutcome[] = selection.map((component, index) => {
    const keep = locked[index];
    if (keep) return { ...keep, index, faces: [...keep.faces] };
    const { faces, faceIndex } = buildFaces(component, fullPools[index]!, rng);
    return { index, culture: dice[index]!, componentId: component.id, faces, faceIndex };
  });

  return { ok: true, outcome: { result, dice: dieOutcomes } };
}

/** Deterministic faces for the idle dice before the first roll. */
export function previewFaces(
  dice: readonly CultureId[],
  registry: CultureRegistry = defaultRegistry,
): string[][] {
  return dice.map((_, i) => {
    const pool = eligibleComponents(dice, i, registry);
    const faces: string[] = [];
    for (let f = 0; f < FACES_PER_DIE && pool.length > 0; f++) faces.push(pool[(f * 7 + i * 3) % pool.length]!.id);
    return faces;
  });
}

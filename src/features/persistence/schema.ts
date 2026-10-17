import { defaultRegistry, type CultureRegistry } from "@/data/cultures";
import { formatGeneratedName } from "@/features/formatting/formatName";
import { signatureOf } from "@/features/generation/generate";
import { isCultureId, validateDiceConfig } from "@/features/generation/config";
import { type GenerationMode, type NameResult, type ResultExplanation } from "@/types/generation";
import type { CultureId } from "@/types/names";

/** Functional storage (favorites, history, preferences). Written only with Functional consent. */
export const STORAGE_KEY = "mynamae:state";
export const SCHEMA_VERSION = 2;
export const HISTORY_LIMIT = 24;
export const FAVORITES_LIMIT = 100;

export type MotionPreference = "system" | "reduced" | "full";
/** Established-name style filter; only applied to curated entries that carry gender metadata. */
export type NameStyle = "any" | "f" | "m" | "u";

export interface Preferences {
  motion: MotionPreference;
  dice3d: boolean;
  mode: GenerationMode;
  sound: boolean;
  shake: boolean;
  style: NameStyle;
}

export interface PersistedState {
  version: typeof SCHEMA_VERSION;
  preferences: Preferences;
  dice: CultureId[];
  history: NameResult[];
  favorites: NameResult[];
}

/** Shared default snapshot; state updates always create new objects, so this is never mutated. */
export const DEFAULT_STATE: PersistedState = {
  version: SCHEMA_VERSION,
  preferences: { motion: "system", dice3d: true, mode: "established", sound: false, shake: false, style: "any" },
  dice: ["turkic", "turkic"],
  history: [],
  favorites: [],
};

const MODES: readonly GenerationMode[] = ["established", "creative"];
const MOTIONS: readonly MotionPreference[] = ["system", "reduced", "full"];
const STYLES: readonly NameStyle[] = ["any", "f", "m", "u"];
const EXPLANATIONS: readonly ResultExplanation[] = [
  "established",
  "creative",
  "creative-matched",
  "established-unavailable-mixed",
];

export const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

export const resultSignature = (r: Pick<NameResult, "components">) => signatureOf(r.components.map((c) => c.componentId));

/** Validates a stored result against the current dictionaries; stale or malformed entries are dropped. */
export function parseResult(value: unknown, registry: CultureRegistry = defaultRegistry): NameResult | null {
  if (!isRecord(value)) return null;
  const { id, createdAt, mode, requestedMode, dice, components, curatedNameId, explanation } = value;
  if (typeof id !== "string" || !id) return null;
  if (typeof createdAt !== "number" || !Number.isFinite(createdAt)) return null;
  if (!MODES.includes(mode as GenerationMode) || !MODES.includes(requestedMode as GenerationMode)) return null;
  if (!EXPLANATIONS.includes(explanation as ResultExplanation)) return null;
  if (!Array.isArray(dice) || !validateDiceConfig(dice).ok) return null;
  if (!Array.isArray(components) || components.length !== dice.length) return null;
  const refs = [];
  for (const [i, ref] of components.entries()) {
    if (!isRecord(ref) || typeof ref.componentId !== "string" || ref.culture !== dice[i]) return null;
    refs.push({ componentId: ref.componentId, culture: ref.culture as CultureId });
  }
  if (curatedNameId !== undefined && typeof curatedNameId !== "string") return null;
  const draft = {
    components: refs,
    explanation: explanation as ResultExplanation,
    ...(curatedNameId ? { curatedNameId } : {}),
  };
  const formatted = formatGeneratedName(draft, registry);
  if (!formatted) return null;
  return {
    id,
    createdAt,
    mode: mode as GenerationMode,
    requestedMode: requestedMode as GenerationMode,
    dice: dice as CultureId[],
    ...draft,
    cultures: [...new Set(dice as CultureId[])],
    // Re-derived so corrected dictionary spellings propagate to saved names.
    displayName: formatted.primaryText,
  };
}

export function parseResults(value: unknown, limit: number): { items: NameResult[]; dropped: boolean } {
  if (!Array.isArray(value)) return { items: [], dropped: value !== undefined };
  const items: NameResult[] = [];
  const seen = new Set<string>();
  for (const entry of value.slice(0, limit)) {
    const parsed = parseResult(entry);
    if (parsed && !seen.has(parsed.id)) {
      items.push(parsed);
      seen.add(parsed.id);
    }
  }
  return { items, dropped: items.length !== Math.min(value.length, limit) };
}

/** Lenient preference parsing: unknown or invalid fields fall back to defaults individually. */
export function parsePreferences(value: unknown): Preferences {
  const p = isRecord(value) ? value : {};
  const d = DEFAULT_STATE.preferences;
  return {
    motion: MOTIONS.includes(p.motion as MotionPreference) ? (p.motion as MotionPreference) : d.motion,
    dice3d: typeof p.dice3d === "boolean" ? p.dice3d : d.dice3d,
    mode: MODES.includes(p.mode as GenerationMode) ? (p.mode as GenerationMode) : d.mode,
    sound: typeof p.sound === "boolean" ? p.sound : d.sound,
    shake: typeof p.shake === "boolean" ? p.shake : d.shake,
    style: STYLES.includes(p.style as NameStyle) ? (p.style as NameStyle) : d.style,
  };
}

export function parseDice(value: unknown): CultureId[] | null {
  return Array.isArray(value) && value.every(isCultureId) && validateDiceConfig(value).ok ? (value as CultureId[]) : null;
}

export interface ParseOutcome {
  state: PersistedState;
  /** True when stored data existed but part of it had to be discarded. */
  recovered: boolean;
}

/** Parses the body of a stored state object (shared by the current schema and the legacy migration). */
export function parseStateBody(data: Record<string, unknown>): ParseOutcome {
  const dice = parseDice(data.dice);
  const history = parseResults(data.history, HISTORY_LIMIT);
  const favorites = parseResults(data.favorites, FAVORITES_LIMIT);
  return {
    state: {
      version: SCHEMA_VERSION,
      preferences: parsePreferences(data.preferences),
      dice: dice ?? [...DEFAULT_STATE.dice],
      history: history.items,
      favorites: favorites.items,
    },
    recovered: !dice || history.dropped || favorites.dropped,
  };
}

export function parsePersistedState(raw: string | null): ParseOutcome {
  if (raw === null) return { state: DEFAULT_STATE, recovered: false };
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { state: DEFAULT_STATE, recovered: true };
  }
  if (!isRecord(data) || data.version !== SCHEMA_VERSION) {
    // Unknown or future versions are not guessed at; start fresh.
    return { state: DEFAULT_STATE, recovered: true };
  }
  return parseStateBody(data);
}

export function serializeState(state: PersistedState): string {
  return JSON.stringify(state);
}

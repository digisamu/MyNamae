import { defaultRegistry, type CultureRegistry } from "@/data/cultures";
import { formatGeneratedName } from "@/features/formatting/formatName";
import { isCultureId, validateDiceConfig } from "@/features/generation/config";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/features/localization/i18n";
import { MAX_DICE, MIN_DICE, type GenerationMode, type NameResult, type ResultExplanation } from "@/types/generation";
import type { CultureId } from "@/types/names";

export const STORAGE_KEY = "nameforge:state";
export const SCHEMA_VERSION = 1;
export const HISTORY_LIMIT = 24;
export const FAVORITES_LIMIT = 100;

export type MotionPreference = "system" | "reduced" | "full";

export interface Preferences {
  motion: MotionPreference;
  dice3d: boolean;
  mode: GenerationMode;
}

export interface PersistedState {
  version: typeof SCHEMA_VERSION;
  locale: Locale;
  preferences: Preferences;
  dice: CultureId[];
  history: NameResult[];
  favorites: NameResult[];
}

/** Shared default snapshot; state updates always create new objects, so this is never mutated. */
export const DEFAULT_STATE: PersistedState = {
  version: SCHEMA_VERSION,
  locale: DEFAULT_LOCALE,
  preferences: { motion: "system", dice3d: true, mode: "established" },
  dice: ["turkic", "turkic"],
  history: [],
  favorites: [],
};

const MODES: readonly GenerationMode[] = ["established", "creative"];
const MOTIONS: readonly MotionPreference[] = ["system", "reduced", "full"];
const EXPLANATIONS: readonly ResultExplanation[] = [
  "established",
  "creative",
  "creative-matched",
  "established-unavailable-mixed",
];

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

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

function parseResults(value: unknown, limit: number): { items: NameResult[]; dropped: boolean } {
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

export interface ParseOutcome {
  state: PersistedState;
  /** True when stored data existed but part of it had to be discarded. */
  recovered: boolean;
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

  let recovered = false;
  const prefs = isRecord(data.preferences) ? data.preferences : {};
  const preferences: Preferences = {
    motion: MOTIONS.includes(prefs.motion as MotionPreference)
      ? (prefs.motion as MotionPreference)
      : DEFAULT_STATE.preferences.motion,
    dice3d: typeof prefs.dice3d === "boolean" ? prefs.dice3d : DEFAULT_STATE.preferences.dice3d,
    mode: MODES.includes(prefs.mode as GenerationMode) ? (prefs.mode as GenerationMode) : DEFAULT_STATE.preferences.mode,
  };

  const diceValid =
    Array.isArray(data.dice) &&
    data.dice.length >= MIN_DICE &&
    data.dice.length <= MAX_DICE &&
    data.dice.every(isCultureId) &&
    validateDiceConfig(data.dice).ok;
  if (!diceValid) recovered = true;

  const history = parseResults(data.history, HISTORY_LIMIT);
  const favorites = parseResults(data.favorites, FAVORITES_LIMIT);
  recovered ||= history.dropped || favorites.dropped || !isLocale(data.locale);

  return {
    state: {
      version: SCHEMA_VERSION,
      locale: isLocale(data.locale) ? data.locale : DEFAULT_LOCALE,
      preferences,
      dice: diceValid ? (data.dice as CultureId[]) : [...DEFAULT_STATE.dice],
      history: history.items,
      favorites: favorites.items,
    },
    recovered,
  };
}

export function serializeState(state: PersistedState): string {
  return JSON.stringify(state);
}

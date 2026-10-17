import { isLocale, type Locale } from "@/features/localization/i18n";
import { safeRead, type KeyValueStorage } from "@/lib/storage/safeStorage";
import type { NameResult } from "@/types/generation";
import {
  FAVORITES_LIMIT,
  HISTORY_LIMIT,
  STORAGE_KEY,
  isRecord,
  parsePersistedState,
  parseStateBody,
  resultSignature,
  type PersistedState,
} from "./schema";

/** Key used by the product's previous name. Read once for migration, then removed. */
export const LEGACY_STORAGE_KEY = "nameforge:state";

export interface LegacyData {
  state: PersistedState;
  locale: Locale | null;
}

/** Salvages whatever is valid from the legacy (v1) state; returns null when nothing is readable. */
export function parseLegacyState(raw: string | null): LegacyData | null {
  if (raw === null) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(data)) return null;
  return { state: parseStateBody(data).state, locale: isLocale(data.locale) ? data.locale : null };
}

function union(primary: readonly NameResult[], secondary: readonly NameResult[], limit: number, sort: boolean) {
  const seen = new Set(primary.map(resultSignature));
  const merged = [...primary, ...secondary.filter((r) => !seen.has(resultSignature(r)))];
  if (sort) merged.sort((a, b) => b.createdAt - a.createdAt);
  return merged.slice(0, limit);
}

/** Combines current data with legacy data. Current wins on conflicts; no valid favorite is dropped. */
export function mergeStates(current: PersistedState, legacy: PersistedState): PersistedState {
  return {
    ...current,
    history: union(current.history, legacy.history, HISTORY_LIMIT, true),
    favorites: union(current.favorites, legacy.favorites, FAVORITES_LIMIT, false),
  };
}

export interface LoadOutcome {
  state: PersistedState;
  recovered: boolean;
  /** Legacy data was found (valid or not) and should be removed once the state is persisted. */
  legacyPresent: boolean;
  legacyLocale: Locale | null;
}

/**
 * Reads the current key and folds in the legacy key, without writing anything.
 * Idempotent: once the legacy key is gone, the result equals a plain read of the current key.
 */
export function loadWithMigration(storage: KeyValueStorage | null): LoadOutcome {
  const currentRaw = safeRead(storage, STORAGE_KEY);
  const legacyRaw = safeRead(storage, LEGACY_STORAGE_KEY);
  const current = parsePersistedState(currentRaw);
  const legacy = parseLegacyState(legacyRaw);
  if (!legacy) {
    return { ...current, legacyPresent: legacyRaw !== null, legacyLocale: null };
  }
  const state = currentRaw === null ? { ...legacy.state } : mergeStates(current.state, legacy.state);
  return { state, recovered: current.recovered, legacyPresent: true, legacyLocale: legacy.locale };
}

import { getLocalStorage, safeRead, safeRemove, safeWrite, type KeyValueStorage } from "@/lib/storage/safeStorage";
import { LEGACY_STORAGE_KEY, loadWithMigration } from "./migration";
import { DEFAULT_STATE, STORAGE_KEY, parsePersistedState, serializeState, type PersistedState } from "./schema";

export interface StoreStatus {
  available: boolean;
  recovered: boolean;
  /** Whether Functional consent currently allows writing to localStorage. */
  persisting: boolean;
}

export interface PersistentStore {
  subscribe(listener: () => void): () => void;
  getSnapshot(): PersistedState;
  getServerSnapshot(): PersistedState;
  getStatus(): StoreStatus;
  update(updater: (state: PersistedState) => PersistedState): void;
  /** Enables or disables writes. Enabling saves the current in-memory state and completes any legacy migration. */
  setPersistence(enabled: boolean): void;
  /** True when anything (current or legacy) is stored in the browser. */
  hasPersistedData(): boolean;
  /** Deletes all functional data from storage; the in-memory session state is kept. */
  clearPersisted(): void;
}

/**
 * An external store for useSyncExternalStore. Data is always held in memory; it is written to
 * localStorage only while persistence is enabled (Functional consent). The server snapshot is the
 * defaults, so the first client render matches the server HTML.
 */
export function createPersistentStore(
  resolveStorage: () => KeyValueStorage | null = getLocalStorage,
): PersistentStore {
  const listeners = new Set<() => void>();
  let state: PersistedState | null = null;
  let storage: KeyValueStorage | null = null;
  let legacyPresent = false;
  let persisting = false;
  let status: Omit<StoreStatus, "persisting"> = { available: false, recovered: false };

  const load = (): PersistedState => {
    storage = resolveStorage();
    const outcome = loadWithMigration(storage);
    legacyPresent = outcome.legacyPresent;
    status = { available: storage !== null, recovered: outcome.recovered };
    return outcome.state;
  };

  const ensure = (): PersistedState => (state ??= load());
  const emit = () => listeners.forEach((l) => l());

  const write = (next: PersistedState) => {
    if (!persisting || !storage) return;
    if (!safeWrite(storage, STORAGE_KEY, serializeState(next))) {
      status = { ...status, available: false };
      return;
    }
    // The legacy key is removed only after its data has been safely written under the new key.
    if (legacyPresent && safeRemove(storage, LEGACY_STORAGE_KEY)) legacyPresent = false;
  };

  const onStorageEvent = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY || !persisting) return;
    state = parsePersistedState(event.newValue).state;
    emit();
  };

  return {
    subscribe(listener) {
      listeners.add(listener);
      if (listeners.size === 1 && typeof window !== "undefined") window.addEventListener("storage", onStorageEvent);
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && typeof window !== "undefined") window.removeEventListener("storage", onStorageEvent);
      };
    },
    getSnapshot: ensure,
    getServerSnapshot: () => DEFAULT_STATE,
    getStatus() {
      ensure();
      return { ...status, persisting };
    },
    update(updater) {
      const current = ensure();
      const next = updater(current);
      if (next === current) return;
      state = next;
      write(next);
      emit();
    },
    setPersistence(enabled) {
      const current = ensure();
      if (enabled === persisting) return;
      persisting = enabled;
      if (enabled) write(current);
      emit();
    },
    hasPersistedData() {
      ensure();
      return safeRead(storage, STORAGE_KEY) !== null || safeRead(storage, LEGACY_STORAGE_KEY) !== null;
    },
    clearPersisted() {
      ensure();
      safeRemove(storage, STORAGE_KEY);
      if (safeRemove(storage, LEGACY_STORAGE_KEY)) legacyPresent = false;
      emit();
    },
  };
}

export const appStore: PersistentStore = createPersistentStore();

import { getLocalStorage, safeRead, safeWrite, type KeyValueStorage } from "@/lib/storage/safeStorage";
import { DEFAULT_STATE, STORAGE_KEY, parsePersistedState, serializeState, type PersistedState } from "./schema";

export interface StoreStatus {
  available: boolean;
  recovered: boolean;
}

export interface PersistentStore {
  subscribe(listener: () => void): () => void;
  getSnapshot(): PersistedState;
  getServerSnapshot(): PersistedState;
  getStatus(): StoreStatus;
  update(updater: (state: PersistedState) => PersistedState): void;
}

/**
 * An external store for useSyncExternalStore. The server snapshot is always the defaults, so the first
 * client render matches the server HTML and the stored state is applied right after hydration.
 */
export function createPersistentStore(
  resolveStorage: () => KeyValueStorage | null = getLocalStorage,
): PersistentStore {
  const listeners = new Set<() => void>();
  let state: PersistedState | null = null;
  let storage: KeyValueStorage | null = null;
  let status: StoreStatus = { available: false, recovered: false };

  const load = (): PersistedState => {
    storage = resolveStorage();
    const { state: parsed, recovered } = parsePersistedState(safeRead(storage, STORAGE_KEY));
    status = { available: storage !== null, recovered };
    return parsed;
  };

  const ensure = (): PersistedState => (state ??= load());

  const emit = () => listeners.forEach((l) => l());

  const onStorageEvent = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    state = parsePersistedState(event.newValue).state;
    emit();
  };

  return {
    subscribe(listener) {
      listeners.add(listener);
      if (listeners.size === 1 && typeof window !== "undefined") {
        window.addEventListener("storage", onStorageEvent);
      }
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && typeof window !== "undefined") {
          window.removeEventListener("storage", onStorageEvent);
        }
      };
    },
    getSnapshot: ensure,
    getServerSnapshot: () => DEFAULT_STATE,
    getStatus() {
      ensure();
      return status;
    },
    update(updater) {
      const next = updater(ensure());
      if (next === state) return;
      state = next;
      if (storage && !safeWrite(storage, STORAGE_KEY, serializeState(next))) {
        status = { ...status, available: false };
      }
      emit();
    },
  };
}

export const appStore: PersistentStore = createPersistentStore();

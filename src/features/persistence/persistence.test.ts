import { describe, expect, it } from "vitest";
import { generateName } from "@/features/generation/generate";
import { createSeededRandom } from "@/lib/random";
import type { KeyValueStorage } from "@/lib/storage/safeStorage";
import { DEFAULT_STATE, STORAGE_KEY, parsePersistedState, serializeState } from "./schema";
import { createPersistentStore } from "./store";

function memoryStorage(initial: Record<string, string> = {}): KeyValueStorage & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => data[k] ?? null,
    setItem: (k, v) => {
      data[k] = v;
    },
  };
}

function sampleResult(seed = 1) {
  const res = generateName({ dice: ["turkic", "japanese"], mode: "creative" }, { rng: createSeededRandom(seed) });
  if (!res.ok) throw new Error("generation failed");
  return res.outcome.result;
}

describe("persisted state parsing", () => {
  it("uses defaults when nothing is stored", () => {
    expect(parsePersistedState(null)).toEqual({ state: DEFAULT_STATE, recovered: false });
  });

  it("recovers from corrupted JSON", () => {
    expect(parsePersistedState("{not json")).toEqual({ state: DEFAULT_STATE, recovered: true });
  });

  it("resets unknown schema versions", () => {
    const { state, recovered } = parsePersistedState(JSON.stringify({ version: 99, locale: "ja" }));
    expect(state).toEqual(DEFAULT_STATE);
    expect(recovered).toBe(true);
  });

  it("round-trips a valid state", () => {
    const result = sampleResult();
    const state = { ...DEFAULT_STATE, locale: "ru" as const, history: [result], favorites: [result] };
    const parsed = parsePersistedState(serializeState(state));
    expect(parsed.recovered).toBe(false);
    expect(parsed.state.locale).toBe("ru");
    expect(parsed.state.history[0]).toEqual(result);
  });

  it("drops invalid entries but keeps valid ones", () => {
    const good = sampleResult(2);
    const raw = JSON.stringify({
      ...DEFAULT_STATE,
      locale: "xx",
      dice: ["turkic"],
      history: [good, { id: 1 }, { ...good, id: "x", components: [{ culture: "turkic", componentId: "tr-missing" }, good.components[1]] }],
      preferences: { motion: "sideways", dice3d: "yes", mode: "creative" },
    });
    const { state, recovered } = parsePersistedState(raw);
    expect(recovered).toBe(true);
    expect(state.locale).toBe("en");
    expect(state.dice).toEqual(DEFAULT_STATE.dice);
    expect(state.history).toEqual([good]);
    expect(state.preferences).toEqual({ motion: "system", dice3d: true, mode: "creative" });
  });
});

describe("persistent store", () => {
  it("persists updates and restores them in a new store (page reload)", () => {
    const storage = memoryStorage();
    const store = createPersistentStore(() => storage);
    store.update((s) => ({ ...s, locale: "ja", preferences: { ...s.preferences, motion: "reduced" } }));
    expect(JSON.parse(storage.data[STORAGE_KEY]!).locale).toBe("ja");

    const reloaded = createPersistentStore(() => storage);
    expect(reloaded.getSnapshot().locale).toBe("ja");
    expect(reloaded.getSnapshot().preferences.motion).toBe("reduced");
  });

  it("works in memory when storage is unavailable", () => {
    const store = createPersistentStore(() => null);
    store.update((s) => ({ ...s, locale: "ru" }));
    expect(store.getSnapshot().locale).toBe("ru");
    expect(store.getStatus().available).toBe(false);
  });

  it("survives a storage that throws on write", () => {
    const store = createPersistentStore(() => ({
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    }));
    expect(() => store.update((s) => ({ ...s, locale: "ja" }))).not.toThrow();
    expect(store.getSnapshot().locale).toBe("ja");
    expect(store.getStatus().available).toBe(false);
  });

  it("serves defaults as the server snapshot to avoid hydration mismatches", () => {
    const storage = memoryStorage({ [STORAGE_KEY]: serializeState({ ...DEFAULT_STATE, locale: "ja" }) });
    const store = createPersistentStore(() => storage);
    expect(store.getServerSnapshot().locale).toBe("en");
    expect(store.getSnapshot().locale).toBe("ja");
  });

  it("notifies subscribers", () => {
    const store = createPersistentStore(() => memoryStorage());
    let calls = 0;
    const unsubscribe = store.subscribe(() => calls++);
    store.update((s) => ({ ...s, locale: "ru" }));
    unsubscribe();
    store.update((s) => ({ ...s, locale: "en" }));
    expect(calls).toBe(1);
  });
});

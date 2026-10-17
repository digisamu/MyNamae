import { describe, expect, it } from "vitest";
import { LEGACY_STORAGE_KEY } from "./migration";
import { DEFAULT_STATE, STORAGE_KEY, parsePersistedState, serializeState } from "./schema";
import { createPersistentStore } from "./store";
import { memoryStorage, sampleResult } from "./testUtils";

describe("persisted state parsing", () => {
  it("uses defaults when nothing is stored", () => {
    expect(parsePersistedState(null)).toEqual({ state: DEFAULT_STATE, recovered: false });
  });

  it("recovers from corrupted JSON", () => {
    expect(parsePersistedState("{not json")).toEqual({ state: DEFAULT_STATE, recovered: true });
  });

  it("resets unknown schema versions", () => {
    const { state, recovered } = parsePersistedState(JSON.stringify({ version: 99, dice: ["arabic", "arabic"] }));
    expect(state).toEqual(DEFAULT_STATE);
    expect(recovered).toBe(true);
  });

  it("round-trips a valid state", () => {
    const result = sampleResult();
    const state = { ...DEFAULT_STATE, history: [result], favorites: [result] };
    const parsed = parsePersistedState(serializeState(state));
    expect(parsed.recovered).toBe(false);
    expect(parsed.state.history[0]).toEqual(result);
  });

  it("drops invalid entries but keeps valid ones", () => {
    const good = sampleResult(2);
    const raw = JSON.stringify({
      ...DEFAULT_STATE,
      dice: ["turkic"],
      history: [good, { id: 1 }, { ...good, id: "x", components: [{ culture: "turkic", componentId: "tr-missing" }, good.components[1]] }],
      preferences: { motion: "sideways", dice3d: "yes", mode: "creative", sound: true },
    });
    const { state, recovered } = parsePersistedState(raw);
    expect(recovered).toBe(true);
    expect(state.dice).toEqual(DEFAULT_STATE.dice);
    expect(state.history).toEqual([good]);
    expect(state.preferences).toEqual({ ...DEFAULT_STATE.preferences, mode: "creative", sound: true });
  });
});

describe("persistent store", () => {
  it("writes nothing to storage before Functional consent", () => {
    const mem = memoryStorage();
    const store = createPersistentStore(() => mem.storage);
    store.update((s) => ({ ...s, favorites: [sampleResult()], preferences: { ...s.preferences, motion: "reduced" } }));
    store.update((s) => ({ ...s, history: [sampleResult(3)] }));
    expect(mem.writes).toEqual([]);
    expect(mem.data).toEqual({});
  });

  it("keeps favorites and history for the session only when Functional is declined", () => {
    const mem = memoryStorage();
    const store = createPersistentStore(() => mem.storage);
    store.setPersistence(false);
    store.update((s) => ({ ...s, favorites: [sampleResult()] }));
    expect(store.getSnapshot().favorites).toHaveLength(1);
    // A reload starts empty: nothing was stored.
    expect(createPersistentStore(() => mem.storage).getSnapshot().favorites).toHaveLength(0);
  });

  it("saves the session state as soon as Functional consent is given, and restores it after reload", () => {
    const mem = memoryStorage();
    const store = createPersistentStore(() => mem.storage);
    store.update((s) => ({ ...s, favorites: [sampleResult()] }));
    store.setPersistence(true);
    expect(mem.writes).toEqual([STORAGE_KEY]);
    store.update((s) => ({ ...s, preferences: { ...s.preferences, motion: "reduced" } }));

    const reloaded = createPersistentStore(() => mem.storage);
    expect(reloaded.getSnapshot().favorites).toHaveLength(1);
    expect(reloaded.getSnapshot().preferences.motion).toBe("reduced");
  });

  it("deletes stored data on withdrawal but keeps the session's names in memory", () => {
    const mem = memoryStorage();
    const store = createPersistentStore(() => mem.storage);
    store.setPersistence(true);
    store.update((s) => ({ ...s, favorites: [sampleResult()] }));
    expect(store.hasPersistedData()).toBe(true);
    store.setPersistence(false);
    store.clearPersisted();
    expect(mem.data[STORAGE_KEY]).toBeUndefined();
    expect(store.hasPersistedData()).toBe(false);
    expect(store.getSnapshot().favorites).toHaveLength(1);
  });

  it("works in memory when storage is unavailable", () => {
    const store = createPersistentStore(() => null);
    store.setPersistence(true);
    store.update((s) => ({ ...s, dice: ["japanese", "japanese"] }));
    expect(store.getSnapshot().dice).toEqual(["japanese", "japanese"]);
    expect(store.getStatus().available).toBe(false);
  });

  it("survives a storage that throws on write", () => {
    const store = createPersistentStore(() => ({
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
      removeItem: () => {},
    }));
    store.setPersistence(true);
    expect(() => store.update((s) => ({ ...s, dice: ["arabic", "arabic"] }))).not.toThrow();
    expect(store.getSnapshot().dice).toEqual(["arabic", "arabic"]);
    expect(store.getStatus().available).toBe(false);
  });

  it("serves defaults as the server snapshot to avoid hydration mismatches", () => {
    const mem = memoryStorage({ [STORAGE_KEY]: serializeState({ ...DEFAULT_STATE, dice: ["arabic", "japanese"] }) });
    const store = createPersistentStore(() => mem.storage);
    expect(store.getServerSnapshot().dice).toEqual(DEFAULT_STATE.dice);
    expect(store.getSnapshot().dice).toEqual(["arabic", "japanese"]);
  });

  it("notifies subscribers", () => {
    const store = createPersistentStore(() => memoryStorage().storage);
    let calls = 0;
    const unsubscribe = store.subscribe(() => calls++);
    store.update((s) => ({ ...s, dice: ["arabic", "arabic"] }));
    unsubscribe();
    store.update((s) => ({ ...s, dice: ["turkic", "turkic"] }));
    expect(calls).toBe(1);
  });

  it("detects legacy data as stored data", () => {
    const mem = memoryStorage({ [LEGACY_STORAGE_KEY]: JSON.stringify({ version: 1 }) });
    expect(createPersistentStore(() => mem.storage).hasPersistedData()).toBe(true);
  });
});

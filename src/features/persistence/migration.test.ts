import { describe, expect, it } from "vitest";
import { createLocaleStore, type CookieJar } from "@/features/consent/clientStores";
import { LEGACY_STORAGE_KEY, loadWithMigration, parseLegacyState } from "./migration";
import { memoryStorage, sampleResult } from "./testUtils";
import { DEFAULT_STATE, STORAGE_KEY, serializeState } from "./schema";
import { createPersistentStore } from "./store";

/** The exact shape written by the previous product version (schema v1, locale inside). */
function legacyBlob(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    version: 1,
    locale: "ja",
    preferences: { motion: "reduced", dice3d: false, mode: "creative" },
    dice: ["arabic", "japanese"],
    history: [sampleResult(1), sampleResult(2)],
    favorites: [sampleResult(3)],
    ...overrides,
  });
}

describe("legacy storage migration (previous product name)", () => {
  it("parses the legacy schema, including its language", () => {
    const legacy = parseLegacyState(legacyBlob())!;
    expect(legacy.locale).toBe("ja");
    expect(legacy.state.version).toBe(2);
    expect(legacy.state.favorites).toHaveLength(1);
    expect(legacy.state.preferences).toMatchObject({ motion: "reduced", dice3d: false, mode: "creative", sound: false });
  });

  it("migrates favorites, history and preferences, then removes the old key once consent allows writing", () => {
    const mem = memoryStorage({ [LEGACY_STORAGE_KEY]: legacyBlob() });
    const store = createPersistentStore(() => mem.storage);
    expect(store.getSnapshot().favorites).toHaveLength(1);
    expect(store.getSnapshot().history).toHaveLength(2);
    expect(store.getSnapshot().dice).toEqual(["arabic", "japanese"]);
    // Before consent: visible in the app, nothing written, old key untouched.
    expect(mem.writes).toEqual([]);
    expect(mem.data[LEGACY_STORAGE_KEY]).toBeDefined();

    store.setPersistence(true);
    expect(mem.data[LEGACY_STORAGE_KEY]).toBeUndefined();
    const saved = JSON.parse(mem.data[STORAGE_KEY]!);
    expect(saved.version).toBe(2);
    expect(saved.favorites).toHaveLength(1);
    expect(saved).not.toHaveProperty("locale");
  });

  it("is idempotent", () => {
    const mem = memoryStorage({ [LEGACY_STORAGE_KEY]: legacyBlob() });
    createPersistentStore(() => mem.storage).setPersistence(true);
    const afterFirst = { ...mem.data };
    createPersistentStore(() => mem.storage).setPersistence(true);
    expect(mem.data).toEqual(afterFirst);
    expect(loadWithMigration(mem.storage).legacyPresent).toBe(false);
  });

  it("never loses valid favorites when both old and new keys exist", () => {
    const current = { ...DEFAULT_STATE, favorites: [sampleResult(4)], history: [sampleResult(5)] };
    const mem = memoryStorage({ [STORAGE_KEY]: serializeState(current), [LEGACY_STORAGE_KEY]: legacyBlob() });
    const store = createPersistentStore(() => mem.storage);
    const ids = store.getSnapshot().favorites.map((f) => f.id).sort();
    expect(ids).toEqual(["r3", "r4"]);
    // Current preferences win over legacy ones.
    expect(store.getSnapshot().preferences.motion).toBe("system");
  });

  it("salvages valid entries from corrupted legacy data", () => {
    const mem = memoryStorage({
      [LEGACY_STORAGE_KEY]: legacyBlob({ favorites: [sampleResult(3), { id: 42 }, "junk"], dice: "nope", locale: "xx" }),
    });
    const outcome = loadWithMigration(mem.storage);
    expect(outcome.state.favorites.map((f) => f.id)).toEqual(["r3"]);
    expect(outcome.state.dice).toEqual(DEFAULT_STATE.dice);
    expect(outcome.legacyLocale).toBeNull();
  });

  it("drops unreadable legacy data without throwing, and cleans it up after consent", () => {
    const mem = memoryStorage({ [LEGACY_STORAGE_KEY]: "{{{ not json" });
    const store = createPersistentStore(() => mem.storage);
    expect(store.getSnapshot()).toEqual(DEFAULT_STATE);
    store.setPersistence(true);
    expect(mem.data[LEGACY_STORAGE_KEY]).toBeUndefined();
  });

  it("carries the legacy language over to the locale cookie", () => {
    const cookies: string[] = [];
    const jar: CookieJar = { read: () => "", write: (c) => cookies.push(c) };
    const store = createLocaleStore(jar, () => legacyBlob());
    expect(store.getSnapshot()).toBe("ja");
    expect(cookies[0]).toMatch(/^mynamae_locale=ja; Path=\/; Max-Age=31536000; SameSite=Lax/);
  });
});

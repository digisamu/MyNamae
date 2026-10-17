import { describe, expect, it } from "vitest";
import { createConsentStore, createLocaleStore, type CookieJar } from "./clientStores";
import { CONSENT_COOKIE, CONSENT_MAX_AGE_SECONDS, LOCALE_COOKIE, POLICY_VERSION, STORAGE_ENTRIES } from "./config";
import {
  ACCEPT_ALL,
  REJECT_NON_ESSENTIAL,
  createConsentRecord,
  decodeConsent,
  encodeConsent,
  parseCookieHeader,
  resolveLocale,
  serializeCookie,
} from "./cookies";

/** A cookie jar that behaves like document.cookie (last write per name wins). */
function fakeJar(initial = "") {
  const values = new Map<string, string>(Object.entries(parseCookieHeader(initial)));
  const written: string[] = [];
  const jar: CookieJar = {
    read: () => [...values].map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("; "),
    write: (cookie) => {
      written.push(cookie);
      const [pair] = cookie.split(";");
      const index = pair!.indexOf("=");
      values.set(pair!.slice(0, index), decodeURIComponent(pair!.slice(index + 1)));
    },
  };
  return { jar, written };
}

const NOW = Date.UTC(2026, 9, 17);

describe("cookie serialisation", () => {
  it("uses Path=/, SameSite=Lax, a max age, no Domain, and Secure only when requested", () => {
    const plain = serializeCookie("a", "b c", { maxAge: 60, secure: false });
    expect(plain).toBe("a=b%20c; Path=/; Max-Age=60; SameSite=Lax");
    expect(plain).not.toMatch(/Domain/i);
    expect(serializeCookie("a", "b", { maxAge: 60, secure: true })).toMatch(/; Secure$/);
  });

  it("parses cookie headers, keeping the first value for duplicated names", () => {
    expect(parseCookieHeader("a=1; b=x%20y; a=2; broken")).toEqual({ a: "1", b: "x y" });
    expect(parseCookieHeader(null)).toEqual({});
  });
});

describe("consent records", () => {
  it("defaults to undecided (banner shown)", () => {
    expect(decodeConsent(undefined, NOW)).toBeNull();
    expect(createConsentStore(fakeJar().jar, () => NOW).getSnapshot()).toBeNull();
  });

  it("round-trips Accept all", () => {
    const record = createConsentRecord(ACCEPT_ALL, NOW);
    expect(decodeConsent(encodeConsent(record), NOW)).toEqual({ ...record, analytics: false });
    expect(record.functional).toBe(true);
  });

  it("never records analytics consent when no provider is configured", () => {
    expect(createConsentRecord(ACCEPT_ALL, NOW).analytics).toBe(false);
  });

  it("round-trips Reject non-essential", () => {
    const decoded = decodeConsent(encodeConsent(createConsentRecord(REJECT_NON_ESSENTIAL, NOW)), NOW);
    expect(decoded).toMatchObject({ functional: false, analytics: false, version: POLICY_VERSION });
  });

  it("round-trips a customized choice", () => {
    const decoded = decodeConsent(encodeConsent(createConsentRecord({ functional: true, analytics: false }, NOW)), NOW);
    expect(decoded?.functional).toBe(true);
  });

  it("asks again when the policy version changes", () => {
    const raw = encodeConsent(createConsentRecord(ACCEPT_ALL, NOW));
    expect(decodeConsent(raw, NOW, POLICY_VERSION + 1)).toBeNull();
    expect(decodeConsent(raw.replace(/^v\d+/, "v0"), NOW)).toBeNull();
  });

  it("asks again after six months", () => {
    const raw = encodeConsent(createConsentRecord(ACCEPT_ALL, NOW));
    expect(decodeConsent(raw, NOW + (CONSENT_MAX_AGE_SECONDS - 60) * 1000)).not.toBeNull();
    expect(decodeConsent(raw, NOW + (CONSENT_MAX_AGE_SECONDS + 60) * 1000)).toBeNull();
  });

  it("treats malformed values as undecided", () => {
    for (const raw of ["", "yes", "v1.f2.a0.tabc", "v1.f1.a0", "v1.f1.a0.t!!"]) expect(decodeConsent(raw, NOW)).toBeNull();
  });
});

describe("consent store", () => {
  it("writes a six-month consent cookie and notifies subscribers", () => {
    const { jar, written } = fakeJar();
    const store = createConsentStore(jar, () => NOW);
    let notified = 0;
    store.subscribe(() => notified++);
    store.save(ACCEPT_ALL);
    expect(written[0]).toMatch(new RegExp(`^${CONSENT_COOKIE}=v${POLICY_VERSION}\\.f1\\.a0\\.t`));
    expect(written[0]).toContain(`Max-Age=${CONSENT_MAX_AGE_SECONDS}`);
    expect(store.getSnapshot()?.functional).toBe(true);
    expect(notified).toBe(1);
    // A fresh store (page reload) reads the decision back from the cookie.
    expect(createConsentStore(jar, () => NOW).getSnapshot()?.functional).toBe(true);
  });

  it("keeps the decision in memory when cookies are blocked", () => {
    const store = createConsentStore({ read: () => "", write: () => {} }, () => NOW);
    store.save(REJECT_NON_ESSENTIAL);
    expect(store.getSnapshot()).toMatchObject({ functional: false });
  });

  it("returns a stable snapshot between reads (required by useSyncExternalStore)", () => {
    const { jar } = fakeJar(`${CONSENT_COOKIE}=${encodeConsent(createConsentRecord(ACCEPT_ALL, NOW))}`);
    const store = createConsentStore(jar, () => NOW);
    expect(store.getSnapshot()).toBe(store.getSnapshot());
  });
});

describe("locale cookie", () => {
  it("resolves the server-side language from the cookie, defaulting to English", () => {
    expect(resolveLocale("ru")).toBe("ru");
    expect(resolveLocale("ja")).toBe("ja");
    expect(resolveLocale("de")).toBe("en");
    expect(resolveLocale(undefined)).toBe("en");
  });

  it("stores the language in a twelve-month cookie", () => {
    const { jar, written } = fakeJar();
    const store = createLocaleStore(jar, () => null);
    expect(store.getSnapshot()).toBe("en");
    store.set("ru");
    expect(written.at(-1)).toMatch(new RegExp(`^${LOCALE_COOKIE}=ru; Path=/; Max-Age=31536000; SameSite=Lax`));
    expect(createLocaleStore(jar, () => null).getSnapshot()).toBe("ru");
  });

  it("still switches language for the session when cookies are disabled", () => {
    const store = createLocaleStore({ read: () => "", write: () => {} }, () => null);
    store.set("ja");
    expect(store.getSnapshot()).toBe("ja");
  });
});

it("lists every cookie and storage key the app sets", () => {
  expect(STORAGE_ENTRIES.map((e) => e.name)).toEqual(["mynamae_consent", "mynamae_locale", "mynamae:state"]);
});

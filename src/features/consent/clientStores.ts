import { DEFAULT_LOCALE, type Locale } from "@/features/localization/i18n";
import { LEGACY_STORAGE_KEY, parseLegacyState } from "@/features/persistence/migration";
import { getLocalStorage, safeRead } from "@/lib/storage/safeStorage";
import {
  CONSENT_COOKIE,
  CONSENT_MAX_AGE_SECONDS,
  LOCALE_COOKIE,
  LOCALE_MAX_AGE_SECONDS,
  type ConsentChoices,
  type ConsentRecord,
} from "./config";
import { createConsentRecord, decodeConsent, decodeLocale, encodeConsent, parseCookieHeader, serializeCookie } from "./cookies";

/** Minimal cookie jar abstraction so the stores can be tested without a browser. */
export interface CookieJar {
  read(): string;
  write(cookie: string): void;
}

export const documentCookieJar: CookieJar = {
  read() {
    try {
      return typeof document === "undefined" ? "" : document.cookie;
    } catch {
      return "";
    }
  },
  write(cookie) {
    try {
      if (typeof document !== "undefined") document.cookie = cookie;
    } catch {
      // Cookies blocked: callers fall back to in-memory state.
    }
  },
};

/** Secure cookies in production over HTTPS (or localhost, which browsers treat as secure). */
const secureCookies = () =>
  process.env.NODE_ENV === "production" && typeof window !== "undefined" && window.isSecureContext;

interface Store<T> {
  subscribe(listener: () => void): () => void;
  getSnapshot(): T;
}

export interface ConsentStore extends Store<ConsentRecord | null> {
  save(choices: ConsentChoices): ConsentRecord;
}

/**
 * Consent state backed by the consent cookie. When cookies are blocked the decision is kept in memory
 * for the visit, so the banner does not reappear on every interaction.
 */
export function createConsentStore(jar: CookieJar = documentCookieJar, now: () => number = Date.now): ConsentStore {
  const listeners = new Set<() => void>();
  let memory: ConsentRecord | null = null;
  let cachedRaw: string | undefined;
  let cached: ConsentRecord | null = null;

  const fromCookie = (): ConsentRecord | null => {
    const raw = parseCookieHeader(jar.read())[CONSENT_COOKIE];
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      cached = decodeConsent(raw, now());
    }
    return cached;
  };

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => memory ?? fromCookie(),
    save(choices) {
      const record = createConsentRecord(choices, now());
      jar.write(serializeCookie(CONSENT_COOKIE, encodeConsent(record), { maxAge: CONSENT_MAX_AGE_SECONDS, secure: secureCookies() }));
      memory = record;
      listeners.forEach((l) => l());
      return record;
    },
  };
}

export interface LocaleStore extends Store<Locale> {
  set(locale: Locale): void;
}

/**
 * Interface language backed by the (necessary) locale cookie, so the server can render the right language.
 * Falls back to a language saved by the previous product version, then to English.
 */
export function createLocaleStore(jar: CookieJar = documentCookieJar, readLegacy: () => string | null = defaultLegacyReader): LocaleStore {
  const listeners = new Set<() => void>();
  let current: Locale | null = null;

  const persist = (locale: Locale) =>
    jar.write(serializeCookie(LOCALE_COOKIE, locale, { maxAge: LOCALE_MAX_AGE_SECONDS, secure: secureCookies() }));

  const resolve = (): Locale => {
    if (current) return current;
    const fromCookie = decodeLocale(parseCookieHeader(jar.read())[LOCALE_COOKIE]);
    if (fromCookie) return (current = fromCookie);
    const legacy = parseLegacyState(readLegacy())?.locale ?? null;
    if (legacy) {
      persist(legacy);
      return (current = legacy);
    }
    return (current = DEFAULT_LOCALE);
  };

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: resolve,
    set(locale) {
      current = locale;
      persist(locale);
      listeners.forEach((l) => l());
    },
  };
}

function defaultLegacyReader(): string | null {
  return safeRead(getLocalStorage(), LEGACY_STORAGE_KEY);
}

export const consentStore = createConsentStore();
export const localeStore = createLocaleStore();

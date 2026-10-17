/** Bump to request consent again after a material change in what is stored. */
export const POLICY_VERSION = 1;

export const CONSENT_COOKIE = "mynamae_consent";
export const LOCALE_COOKIE = "mynamae_locale";

const DAY = 24 * 60 * 60;
/** Consent is requested again after roughly six months. */
export const CONSENT_MAX_AGE_SECONDS = 182 * DAY;
export const LOCALE_MAX_AGE_SECONDS = 365 * DAY;

/**
 * No analytics provider ships with MyNamae. A future privacy-friendly integration must be configured via
 * this variable; without it the Analytics category is not shown and nothing is loaded.
 */
export const ANALYTICS_ENABLED = Boolean(process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER);

export type ConsentCategory = "necessary" | "functional" | "analytics";

export interface ConsentChoices {
  functional: boolean;
  analytics: boolean;
}

export interface ConsentRecord extends ConsentChoices {
  version: number;
  /** Unix time (ms) of the decision. */
  decidedAt: number;
}

export interface StorageEntry {
  name: string;
  kind: "cookie" | "localStorage";
  category: ConsentCategory;
  /** Message key suffix under privacy.entries.<id>. */
  id: "consent" | "locale" | "state";
  duration: "sixMonths" | "twelveMonths" | "untilCleared";
}

/** Every cookie and storage key the app can set. Shown verbatim in the cookie settings dialog. */
export const STORAGE_ENTRIES: readonly StorageEntry[] = [
  { name: CONSENT_COOKIE, kind: "cookie", category: "necessary", id: "consent", duration: "sixMonths" },
  { name: LOCALE_COOKIE, kind: "cookie", category: "necessary", id: "locale", duration: "twelveMonths" },
  { name: "mynamae:state", kind: "localStorage", category: "functional", id: "state", duration: "untilCleared" },
];

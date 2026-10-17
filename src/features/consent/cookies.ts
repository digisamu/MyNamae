import { DEFAULT_LOCALE, isLocale, type Locale } from "@/features/localization/i18n";
import {
  ANALYTICS_ENABLED,
  CONSENT_MAX_AGE_SECONDS,
  POLICY_VERSION,
  type ConsentChoices,
  type ConsentRecord,
} from "./config";

export interface CookieOptions {
  maxAge: number;
  secure: boolean;
}

/** Serialises a first-party cookie: Path=/, SameSite=Lax, no Domain, Secure when requested. */
export function serializeCookie(name: string, value: string, { maxAge, secure }: CookieOptions): string {
  const parts = [`${name}=${encodeURIComponent(value)}`, "Path=/", `Max-Age=${Math.max(0, Math.floor(maxAge))}`, "SameSite=Lax"];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function parseCookieHeader(header: string | null | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    const key = part.slice(0, index).trim();
    if (!key || key in out) continue;
    try {
      out[key] = decodeURIComponent(part.slice(index + 1).trim());
    } catch {
      out[key] = part.slice(index + 1).trim();
    }
  }
  return out;
}

/** Compact, cookie-safe encoding: "v1.f1.a0.t<base36 ms>". */
export function encodeConsent(record: ConsentRecord): string {
  return `v${record.version}.f${record.functional ? 1 : 0}.a${record.analytics ? 1 : 0}.t${record.decidedAt.toString(36)}`;
}

/**
 * Returns null (consent must be requested) for missing, malformed, outdated-policy or expired records.
 */
export function decodeConsent(
  raw: string | null | undefined,
  now: number,
  policyVersion = POLICY_VERSION,
): ConsentRecord | null {
  if (!raw) return null;
  const match = /^v(\d+)\.f([01])\.a([01])\.t([0-9a-z]+)$/.exec(raw);
  if (!match) return null;
  const version = Number(match[1]);
  const decidedAt = parseInt(match[4]!, 36);
  if (version !== policyVersion || !Number.isFinite(decidedAt)) return null;
  if (decidedAt > now + 60_000 || now - decidedAt > CONSENT_MAX_AGE_SECONDS * 1000) return null;
  return {
    version,
    functional: match[2] === "1",
    // Never report analytics consent when no provider exists.
    analytics: ANALYTICS_ENABLED && match[3] === "1",
    decidedAt,
  };
}

export function createConsentRecord(choices: ConsentChoices, now: number): ConsentRecord {
  return {
    version: POLICY_VERSION,
    functional: choices.functional,
    analytics: ANALYTICS_ENABLED && choices.analytics,
    decidedAt: now,
  };
}

export const ACCEPT_ALL: ConsentChoices = { functional: true, analytics: true };
export const REJECT_NON_ESSENTIAL: ConsentChoices = { functional: false, analytics: false };

export function decodeLocale(raw: string | null | undefined): Locale | null {
  return isLocale(raw) ? raw : null;
}

export function resolveLocale(raw: string | null | undefined): Locale {
  return decodeLocale(raw) ?? DEFAULT_LOCALE;
}

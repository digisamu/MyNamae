import { cookies } from "next/headers";
import type { Locale } from "@/features/localization/i18n";
import { CONSENT_COOKIE, LOCALE_COOKIE, type ConsentRecord } from "./config";
import { decodeConsent, resolveLocale } from "./cookies";

export interface ServerPreferences {
  locale: Locale;
  consent: ConsentRecord | null;
}

/** Reads the necessary cookies on the server so the first render uses the right language and banner state. */
export async function readServerPreferences(): Promise<ServerPreferences> {
  const jar = await cookies();
  return {
    locale: resolveLocale(jar.get(LOCALE_COOKIE)?.value),
    consent: decodeConsent(jar.get(CONSENT_COOKIE)?.value, Date.now()),
  };
}

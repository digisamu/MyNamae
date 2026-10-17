"use client";

import { ConsentLayer } from "@/components/consent/ConsentLayer";
import { CombinationBuilder } from "@/components/combination-builder/CombinationBuilder";
import { CultureSelector } from "@/components/culture-selector/CultureSelector";
import { SiteFooter } from "@/components/footer/SiteFooter";
import { SiteHeader } from "@/components/navigation/SiteHeader";
import { SavedNames } from "@/components/saved-names/SavedNames";
import { SettingsPanel } from "@/components/settings/SettingsPanel";
import type { ConsentRecord } from "@/features/consent/config";
import type { Locale } from "@/features/localization/i18n";
import type { NameResult } from "@/types/generation";
import { HeroSection } from "./HeroSection";
import { MyNamaeProvider, useMyNamae } from "./MyNamaeProvider";

function LiveRegion() {
  const { announcement } = useMyNamae();
  return (
    <div role="status" aria-live="polite" aria-atomic="true" className="sr-only" data-testid="announcement">
      {announcement}
    </div>
  );
}

interface AppProps {
  initialLocale: Locale;
  initialConsent: ConsentRecord | null;
  initialShared: NameResult | null;
}

export function MyNamaeApp({ initialLocale, initialConsent, initialShared }: AppProps) {
  return (
    <MyNamaeProvider initialLocale={initialLocale} initialConsent={initialConsent} initialShared={initialShared}>
      <div id="top" className="flex min-h-dvh flex-col">
        <SiteHeader />
        <main id="main" tabIndex={-1} className="flex-1 outline-none">
          <HeroSection />
          <CultureSelector />
          <CombinationBuilder />
          <SavedNames />
          <SettingsPanel />
        </main>
        <SiteFooter />
        <LiveRegion />
        <ConsentLayer />
      </div>
    </MyNamaeProvider>
  );
}

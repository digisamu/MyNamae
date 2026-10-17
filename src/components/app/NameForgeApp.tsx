"use client";

import { CombinationBuilder } from "@/components/combination-builder/CombinationBuilder";
import { CultureSelector } from "@/components/culture-selector/CultureSelector";
import { SiteFooter } from "@/components/footer/SiteFooter";
import { SiteHeader } from "@/components/navigation/SiteHeader";
import { SavedNames } from "@/components/saved-names/SavedNames";
import { SettingsPanel } from "@/components/settings/SettingsPanel";
import { HeroSection } from "./HeroSection";
import { NameForgeProvider, useNameForge } from "./NameForgeProvider";

function LiveRegion() {
  const { announcement } = useNameForge();
  return (
    <div role="status" aria-live="polite" aria-atomic="true" className="sr-only" data-testid="announcement">
      {announcement}
    </div>
  );
}

export function NameForgeApp() {
  return (
    <NameForgeProvider>
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
      </div>
    </NameForgeProvider>
  );
}

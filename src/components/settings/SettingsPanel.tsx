"use client";

import { Trash2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useNameForge } from "@/components/app/NameForgeProvider";
import { LanguageSwitcher } from "@/components/navigation/LanguageSwitcher";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import type { MotionPreference } from "@/features/persistence/schema";

function Row({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 border-b border-line py-5 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h3 className="font-medium text-ink">{title}</h3>
        {hint && <p className="mt-1 max-w-md text-sm text-muted">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export function SettingsPanel() {
  const { t, state, setMotion, setDice3d, clearFavorites, storage, hydrated } = useNameForge();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { motion, dice3d } = state.preferences;

  return (
    <section id="settings" aria-labelledby="settings-title" className="border-t border-line/70 bg-ivory/50">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h2 id="settings-title" className="font-display text-3xl font-medium text-ink">
          {t("settings.title")}
        </h2>
        <p className="mt-3 text-muted">{t("settings.description")}</p>

        {hydrated && (!storage.available || storage.recovered) && (
          <p role="status" className="mt-4 rounded-xl bg-sakura/60 px-4 py-3 text-sm text-vermilion-ink">
            {!storage.available ? t("settings.storageUnavailable") : t("settings.storageRecovered")}
          </p>
        )}

        <div className="mt-6 rounded-3xl border border-line bg-surface px-5 sm:px-6">
          <Row title={t("settings.language")}>
            <LanguageSwitcher size="md" full />
          </Row>
          <Row title={t("settings.motion")} hint={t("settings.motionHint")}>
            <SegmentedControl<MotionPreference>
              label={t("settings.motion")}
              value={motion}
              onChange={setMotion}
              testId="motion-setting"
              options={[
                { value: "system", label: t("settings.motionSystem") },
                { value: "reduced", label: t("settings.motionReduced") },
                { value: "full", label: t("settings.motionFull") },
              ]}
            />
          </Row>
          <Row title={t("settings.dice3d")} hint={t("settings.dice3dHint")}>
            <SegmentedControl<"on" | "off">
              label={t("settings.dice3d")}
              value={dice3d ? "on" : "off"}
              onChange={(v) => setDice3d(v === "on")}
              testId="dice3d-setting"
              options={[
                { value: "on", label: t("settings.on") },
                { value: "off", label: t("settings.off") },
              ]}
            />
          </Row>
          <Row title={t("settings.data")}>
            <button
              type="button"
              disabled={state.favorites.length === 0}
              onClick={() => setConfirmOpen(true)}
              className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line-strong px-4 text-sm text-muted hover:bg-ivory hover:text-ink disabled:opacity-40"
            >
              <Trash2 className="size-4" aria-hidden />
              {t("settings.clearFavorites")}
            </button>
          </Row>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title={t("settings.clearFavoritesTitle")}
        body={t("settings.clearFavoritesBody")}
        confirmLabel={t("settings.confirm")}
        cancelLabel={t("saved.cancel")}
        onConfirm={clearFavorites}
        onClose={() => setConfirmOpen(false)}
      />
    </section>
  );
}

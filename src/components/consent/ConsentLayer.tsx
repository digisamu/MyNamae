"use client";

import { useEffect, useRef, useState } from "react";
import { useMyNamae } from "@/components/app/MyNamaeProvider";
import { SealMark } from "@/components/navigation/SealMark";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import { ANALYTICS_ENABLED, STORAGE_ENTRIES, type ConsentChoices } from "@/features/consent/config";
import { ACCEPT_ALL, REJECT_NON_ESSENTIAL } from "@/features/consent/cookies";

/** All three actions share one style: no option is visually favoured. */
const choiceButton =
  "inline-flex min-h-11 flex-1 items-center justify-center rounded-full border border-line-strong bg-surface px-4 text-sm font-medium text-ink hover:bg-ivory sm:flex-none";

function Switch({
  checked,
  disabled,
  onChange,
  label,
  testId,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange?: (value: boolean) => void;
  label: string;
  testId?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      data-testid={testId}
      className={`relative h-7 w-12 shrink-0 rounded-full border transition-colors disabled:cursor-not-allowed ${
        checked ? "border-ink bg-ink" : "border-line-strong bg-ivory"
      } ${disabled ? "opacity-60" : ""}`}
    >
      <span
        aria-hidden
        className={`absolute top-0.5 left-0.5 size-5.5 rounded-full bg-surface shadow-sm transition-transform ${checked ? "translate-x-5" : ""}`}
      />
    </button>
  );
}

function StorageTable() {
  const { t } = useMyNamae();
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
      <table className="w-full min-w-[30rem] text-left text-sm">
        <caption className="sr-only">{t("consent.table.caption")}</caption>
        <thead className="bg-ivory/60 text-xs text-muted">
          <tr>
            <th scope="col" className="px-3 py-2 font-medium">{t("consent.table.name")}</th>
            <th scope="col" className="px-3 py-2 font-medium">{t("consent.table.type")}</th>
            <th scope="col" className="px-3 py-2 font-medium">{t("consent.table.purpose")}</th>
            <th scope="col" className="px-3 py-2 font-medium">{t("consent.table.duration")}</th>
          </tr>
        </thead>
        <tbody>
          {STORAGE_ENTRIES.map((entry) => (
            <tr key={entry.name} className="border-t border-line align-top">
              <td className="px-3 py-2 font-mono text-xs">{entry.name}</td>
              <td className="px-3 py-2">{t(entry.kind === "cookie" ? "consent.table.cookie" : "consent.table.localStorage")}</td>
              <td className="px-3 py-2">{t(`privacy.entries.${entry.id}`)}</td>
              <td className="px-3 py-2 whitespace-nowrap">{t(`privacy.durations.${entry.duration}`)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CookieSettingsDialog() {
  const { t, consent, saveConsent, cookieSettingsOpen, setCookieSettingsOpen, setPrivacyOpen } = useMyNamae();
  const [draft, setDraft] = useState<ConsentChoices>({ functional: false, analytics: false });
  const [openedFor, setOpenedFor] = useState(false);

  // Start from the stored choices each time the dialog opens; never pre-check anything new.
  if (cookieSettingsOpen !== openedFor) {
    setOpenedFor(cookieSettingsOpen);
    if (cookieSettingsOpen) setDraft({ functional: consent?.functional ?? false, analytics: consent?.analytics ?? false });
  }

  const categories = [
    { id: "necessary" as const, checked: true, disabled: true },
    { id: "functional" as const, checked: draft.functional, disabled: false },
    ...(ANALYTICS_ENABLED ? [{ id: "analytics" as const, checked: draft.analytics, disabled: false }] : []),
  ];

  return (
    <Modal
      open={cookieSettingsOpen}
      title={t("consent.dialogTitle")}
      closeLabel={t("consent.close")}
      onClose={() => setCookieSettingsOpen(false)}
      testId="cookie-settings"
      footer={
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <button type="button" className={choiceButton} onClick={() => saveConsent(REJECT_NON_ESSENTIAL)}>
            {t("consent.rejectAll")}
          </button>
          <button type="button" className={choiceButton} onClick={() => saveConsent(ACCEPT_ALL)}>
            {t("consent.acceptAll")}
          </button>
          <button type="button" className={choiceButton} onClick={() => saveConsent(draft)} data-testid="consent-save">
            {t("consent.save")}
          </button>
        </div>
      }
    >
      <p className="text-sm leading-relaxed text-muted">{t("consent.dialogIntro")}</p>
      <ul className="mt-5 flex flex-col gap-3">
        {categories.map((c) => (
          <li key={c.id} className="flex items-start justify-between gap-4 rounded-2xl border border-line bg-surface p-4">
            <div>
              <h3 className="font-medium">{t(`consent.categories.${c.id}.title`)}</h3>
              <p className="mt-1 text-sm text-muted">{t(`consent.categories.${c.id}.description`)}</p>
              {c.id === "necessary" && <p className="mt-1 text-xs font-medium text-vermilion-ink">{t("consent.alwaysOn")}</p>}
            </div>
            <Switch
              checked={c.checked}
              disabled={c.disabled}
              label={t(`consent.categories.${c.id}.title`)}
              testId={`consent-toggle-${c.id}`}
              onChange={(value) => setDraft((d) => ({ ...d, [c.id]: value }))}
            />
          </li>
        ))}
      </ul>
      <div className="mt-6">
        <StorageTable />
      </div>
      <button
        type="button"
        onClick={() => {
          setCookieSettingsOpen(false);
          setPrivacyOpen(true);
        }}
        className="mt-4 text-sm text-vermilion-ink underline-offset-4 hover:underline"
      >
        {t("privacy.title")}
      </button>
    </Modal>
  );
}

function PrivacyDialog() {
  const { t, privacyOpen, setPrivacyOpen, setCookieSettingsOpen } = useMyNamae();
  const sections = [
    ["privacy.whatTitle", "privacy.what"],
    ["privacy.whereTitle", "privacy.where"],
    ["privacy.howLongTitle", "privacy.howLong"],
    ["privacy.withdrawTitle", "privacy.withdraw"],
  ] as const;
  return (
    <Modal
      open={privacyOpen}
      title={t("privacy.title")}
      closeLabel={t("consent.close")}
      onClose={() => setPrivacyOpen(false)}
      testId="privacy-dialog"
      footer={
        <div className="flex justify-end">
          <button
            type="button"
            className={choiceButton}
            onClick={() => {
              setPrivacyOpen(false);
              setCookieSettingsOpen(true);
            }}
          >
            {t("footer.cookieSettings")}
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        {sections.map(([title, body]) => (
          <section key={title}>
            <h3 className="font-medium">{t(title)}</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted">{t(body)}</p>
          </section>
        ))}
        <StorageTable />
      </div>
    </Modal>
  );
}

/** Non-blocking first-visit banner anchored to the bottom; the page is padded so nothing hides beneath it. */
function ConsentBanner() {
  const { t, saveConsent, setCookieSettingsOpen } = useMyNamae();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const root = document.documentElement;
    const apply = () => root.style.setProperty("--consent-banner-height", `${el.offsetHeight + 16}px`);
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(el);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--consent-banner-height");
    };
  }, []);

  return (
    <div
      ref={ref}
      role="region"
      aria-labelledby="consent-title"
      data-testid="consent-banner"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-3xl animate-banner rounded-3xl border border-line bg-ivory/95 p-4 shadow-lift backdrop-blur sm:p-5"
    >
      <div className="flex items-start gap-3">
        <SealMark className="mt-0.5 hidden size-8 shrink-0 -rotate-3 sm:block" />
        <div className="min-w-0">
          <h2 id="consent-title" className="font-display text-base font-medium">
            {t("consent.bannerTitle")}
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-muted sm:text-sm">{t("consent.bannerBody")}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 sm:justify-end">
        <button type="button" className={choiceButton} onClick={() => saveConsent(ACCEPT_ALL)} data-testid="consent-accept">
          {t("consent.acceptAll")}
        </button>
        <button type="button" className={choiceButton} onClick={() => saveConsent(REJECT_NON_ESSENTIAL)} data-testid="consent-reject">
          {t("consent.rejectAll")}
        </button>
        <button type="button" className={choiceButton} onClick={() => setCookieSettingsOpen(true)} data-testid="consent-customize">
          {t("consent.customize")}
        </button>
      </div>
    </div>
  );
}

export function ConsentLayer() {
  const { t, consent, pendingConsent, resolvePendingConsent } = useMyNamae();
  return (
    <>
      {consent === null && <ConsentBanner />}
      <CookieSettingsDialog />
      <PrivacyDialog />
      <ConfirmDialog
        open={pendingConsent !== null}
        title={t("consent.deleteTitle")}
        body={t("consent.deleteBody")}
        confirmLabel={t("consent.deleteConfirm")}
        cancelLabel={t("consent.cancel")}
        onConfirm={() => resolvePendingConsent(true)}
        onClose={() => resolvePendingConsent(false)}
      />
    </>
  );
}

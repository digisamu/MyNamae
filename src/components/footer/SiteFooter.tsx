"use client";

import { useSyncExternalStore } from "react";
import { useMyNamae } from "@/components/app/MyNamaeProvider";
import { LanguageSwitcher } from "@/components/navigation/LanguageSwitcher";
import { Wordmark } from "@/components/navigation/Logo";
import { SealMark } from "@/components/navigation/SealMark";

const GITHUB_URL = "https://github.com/digisamu";
const WEBSITE_URL = "https://faridhuseynov.dev";

const noopSubscribe = () => () => {};
// Read on the client so the year is never frozen into prerendered HTML.
const currentYear = () => new Date().getFullYear();

function GithubMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden>
      <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.42c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.56-.29-5.25-1.28-5.25-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.7 5.38-5.27 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
    </svg>
  );
}

export function SiteFooter() {
  const { t, setCookieSettingsOpen, setPrivacyOpen } = useMyNamae();
  const year = useSyncExternalStore(noopSubscribe, currentYear, () => null);

  return (
    <footer className="border-t border-line bg-washi">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12 sm:px-6 md:flex-row md:items-start md:justify-between">
        <div className="max-w-sm">
          <p className="flex items-center gap-2">
            <SealMark className="size-7" />
            <Wordmark className="text-lg" />
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted">{t("footer.tagline")}</p>
          <p className="mt-4 text-xs text-muted" data-testid="footer-copyright">
            {year !== null ? t("footer.copyright", { year }) : " "}
          </p>
          <p className="mt-1 text-xs text-muted">Made with ❤️ from Azerbaijan</p>
        </div>
        <div className="flex flex-col gap-5 md:items-end">
          <ul className="flex flex-wrap gap-2">
            <li>
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line px-4 text-sm hover:bg-ivory"
              >
                <GithubMark />
                {t("footer.github")}
              </a>
            </li>
            <li>
              <a
                href={WEBSITE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line px-4 text-sm hover:bg-ivory"
              >
                <span aria-hidden className="size-1.5 rounded-full bg-vermilion" />
                {t("footer.website")}
              </a>
            </li>
          </ul>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm md:justify-end">
            <button
              type="button"
              onClick={() => setCookieSettingsOpen(true)}
              className="text-muted underline-offset-4 hover:text-ink hover:underline"
              data-testid="footer-cookie-settings"
            >
              {t("footer.cookieSettings")}
            </button>
            <button
              type="button"
              onClick={() => setPrivacyOpen(true)}
              className="text-muted underline-offset-4 hover:text-ink hover:underline"
              data-testid="footer-privacy"
            >
              {t("footer.privacy")}
            </button>
          </div>
          <div className="md:hidden">
            <LanguageSwitcher size="md" full />
          </div>
        </div>
      </div>
    </footer>
  );
}

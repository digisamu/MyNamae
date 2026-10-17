import type { Metadata, Viewport } from "next";
import { Noto_Naskh_Arabic, Noto_Sans, Noto_Sans_JP, Noto_Serif, Shippori_Mincho } from "next/font/google";
import { readServerPreferences } from "@/features/consent/server";
import { messagesByLocale } from "@/features/localization/i18n";
import "./globals.css";

const sans = Noto_Sans_JP({
  variable: "--font-noto-sans",
  subsets: ["latin", "latin-ext", "cyrillic"],
  weight: ["400", "500", "700"],
  display: "swap",
  // A metric-adjusted local fallback would swallow glyphs meant for the cyrillic-ext font below.
  adjustFontFallback: false,
});

// Azerbaijani Cyrillic letters (Ҹ, Ҝ, Ғ, Һ, Ә, Ө, Ү) and Hepburn macrons (ū, ō) are not in Noto Sans JP.
const sansExt = Noto_Sans({
  variable: "--font-noto-sans-ext",
  subsets: ["cyrillic-ext", "latin-ext"],
  weight: ["400", "500", "700"],
  display: "swap",
  preload: false,
});

const serif = Noto_Serif({
  variable: "--font-noto-serif",
  subsets: ["latin", "latin-ext", "cyrillic", "cyrillic-ext"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const mincho = Shippori_Mincho({
  variable: "--font-shippori",
  subsets: ["latin"],
  weight: ["500", "700"],
  display: "swap",
});

const naskh = Noto_Naskh_Arabic({
  variable: "--font-naskh",
  subsets: ["arabic"],
  weight: ["400", "600"],
  display: "swap",
  preload: false,
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const OG_LOCALE: Record<string, string> = { en: "en_US", ru: "ru_RU", ja: "ja_JP" };

/** Metadata follows the language cookie, so shared previews and the tab title match the interface. */
export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await readServerPreferences();
  const messages = messagesByLocale[locale];
  return {
    metadataBase: new URL(SITE_URL),
    title: messages.meta.title,
    description: messages.meta.description,
    applicationName: "MyNamae",
    icons: { icon: [{ url: "/icon.svg", type: "image/svg+xml" }], apple: "/apple-icon" },
    openGraph: {
      type: "website",
      siteName: "MyNamae",
      title: messages.meta.title,
      description: messages.meta.description,
      locale: OG_LOCALE[locale],
    },
    twitter: { card: "summary_large_image", title: messages.meta.title, description: messages.meta.description },
  };
}

export const viewport: Viewport = {
  themeColor: "#FAF9F6",
  colorScheme: "light",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // The language cookie is read on the server, so the very first paint is already in the right language.
  const { locale } = await readServerPreferences();
  return (
    <html
      lang={locale}
      className={`${sans.variable} ${sansExt.variable} ${serif.variable} ${mincho.variable} ${naskh.variable} antialiased`}
    >
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}

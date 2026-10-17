import type { Metadata, Viewport } from "next";
import { Noto_Naskh_Arabic, Noto_Sans, Noto_Sans_JP, Noto_Serif, Shippori_Mincho } from "next/font/google";
import en from "@/messages/en";
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

export const metadata: Metadata = {
  title: en.meta.title,
  description: en.meta.description,
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#FAF9F6",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${sansExt.variable} ${serif.variable} ${mincho.variable} ${naskh.variable} antialiased`}
    >
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}

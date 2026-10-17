import type { CultureId } from "@/types/names";

/** Visual tokens per culture; hex values mirror the @theme colours for use in canvas textures. */
export const CULTURE_THEME: Readonly<
  Record<CultureId, { accent: string; soft: string; text: string; bg: string; border: string; ring: string }>
> = {
  turkic: {
    accent: "#2e7a83",
    soft: "#e2eeee",
    text: "text-turkic",
    bg: "bg-turkic-soft",
    border: "border-turkic",
    ring: "ring-turkic",
  },
  arabic: {
    accent: "#9a6a1e",
    soft: "#f3ead9",
    text: "text-arabic",
    bg: "bg-arabic-soft",
    border: "border-arabic",
    ring: "ring-arabic",
  },
  japanese: {
    accent: "#3f4c7c",
    soft: "#e5e7f0",
    text: "text-japanese",
    bg: "bg-japanese-soft",
    border: "border-japanese",
    ring: "ring-japanese",
  },
};

import { CanvasTexture, SRGBColorSpace } from "three";
import type { FaceLabel } from "@/features/formatting/formatName";

const SIZE = 512;

function cssFontFamily(variable: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  return value ? `${value}, ${fallback}` : fallback;
}

export interface FaceFonts {
  latin: string;
  japanese: string;
  arabic: string;
}

export function resolveFaceFonts(): FaceFonts {
  const sans = cssFontFamily("--font-noto-sans", "sans-serif");
  return {
    latin: cssFontFamily("--font-noto-serif", "serif"),
    japanese: `${cssFontFamily("--font-shippori", "serif")}, ${sans}`,
    arabic: cssFontFamily("--font-naskh", "serif"),
  };
}

/** Ensures the glyphs we paint are loaded; canvas text silently falls back otherwise. */
export async function loadFaceFonts(fonts: FaceFonts, labels: readonly FaceLabel[]): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;
  const latinText = labels.map((l) => l.primary).join("");
  const arabicText = labels.map((l) => (l.secondary?.lang === "ar" ? l.secondary.text : "")).join("");
  const loads = [
    document.fonts.load(`600 80px ${fonts.latin}`, latinText || "A"),
    document.fonts.load(`600 80px ${fonts.japanese}`, latinText || "あ"),
  ];
  if (arabicText) loads.push(document.fonts.load(`400 60px ${fonts.arabic}`, arabicText));
  await Promise.allSettled(loads);
}

function fitFont(
  ctx: CanvasRenderingContext2D,
  text: string,
  family: string,
  weight: number,
  maxSize: number,
  maxWidth: number,
): number {
  let size = maxSize;
  for (; size > 28; size -= 4) {
    ctx.font = `${weight} ${size}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth) break;
  }
  return size;
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** Paints one die face: warm paper, a culture-coloured inner frame, the label and its native script. */
export function createFaceTexture(label: FaceLabel, accent: string, fonts: FaceFonts): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d")!;

  const gradient = ctx.createLinearGradient(0, 0, SIZE, SIZE);
  gradient.addColorStop(0, "#fffdf9");
  gradient.addColorStop(1, "#f3eee4");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, SIZE, SIZE);

  ctx.strokeStyle = accent;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 6;
  roundedRect(ctx, 52, 52, SIZE - 104, SIZE - 104, 46);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Small seal-like dot in the culture colour.
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(SIZE / 2, 98, 9, 0, Math.PI * 2);
  ctx.fill();

  const isJapanese = label.primaryLang === "ja";
  const primaryFamily = isJapanese ? fonts.japanese : fonts.latin;
  ctx.fillStyle = "#242424";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.direction = "ltr";
  const primarySize = fitFont(ctx, label.primary, primaryFamily, 600, isJapanese ? 128 : 116, SIZE - 150);
  ctx.font = `600 ${primarySize}px ${primaryFamily}`;
  const primaryY = label.secondary ? SIZE / 2 - 22 : SIZE / 2 + 6;
  ctx.fillText(label.primary, SIZE / 2, primaryY);

  if (label.secondary) {
    const rtl = label.secondary.dir === "rtl";
    const family = label.secondary.lang === "ar" ? fonts.arabic : fonts.latin;
    ctx.direction = rtl ? "rtl" : "ltr";
    ctx.fillStyle = "#6b675f";
    const size = fitFont(ctx, label.secondary.text, family, rtl ? 400 : 500, rtl ? 64 : 52, SIZE - 170);
    ctx.font = `${rtl ? 400 : 500} ${size}px ${family}`;
    ctx.fillText(label.secondary.text, SIZE / 2, primaryY + primarySize * 0.5 + 52);
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

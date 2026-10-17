import { SEAL_GLYPH_PATHS } from "@/components/navigation/SealMark";
import type { FormattedName } from "@/features/formatting/formatName";

const W = 1200;
const H = 630;

function cssFont(variable: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  return value ? `${value}, ${fallback}` : fallback;
}

function fit(ctx: CanvasRenderingContext2D, text: string, weight: number, family: string, max: number, maxWidth: number) {
  let size = max;
  for (; size > 24; size -= 4) {
    ctx.font = `${weight} ${size}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth) break;
  }
  return size;
}

export interface CardText {
  /** "Ay · Turkic", one per die. */
  components: readonly string[];
  tagline: string;
}

/** Renders the result card as a PNG entirely on the client, using the page's own fonts. */
export async function renderResultCard(f: FormattedName, text: CardText): Promise<Blob> {
  const serif = cssFont("--font-noto-serif", "serif");
  const mincho = `${cssFont("--font-shippori", "serif")}, ${serif}`;
  const sans = cssFont("--font-noto-sans", "sans-serif");
  const arabic = cssFont("--font-naskh", "serif");
  const primaryFamily = f.primaryLang === "ja" ? mincho : serif;
  const secondaryFamily = f.secondaryLang === "ar" ? arabic : f.secondaryLang === "ja" ? mincho : serif;

  await Promise.allSettled([
    document.fonts.load(`500 120px ${primaryFamily}`, f.primaryText),
    f.secondaryText ? document.fonts.load(`500 56px ${secondaryFamily}`, f.secondaryText) : Promise.resolve(),
    document.fonts.load(`500 40px ${mincho}`, "MyNamae"),
    document.fonts.load(`400 26px ${sans}`, text.components.join(" ") + text.tagline),
  ]);

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D is unavailable");

  ctx.fillStyle = "#faf9f6";
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(160, 80, 0, 160, 80, 520);
  glow.addColorStop(0, "rgba(242,217,214,0.55)");
  glow.addColorStop(1, "rgba(242,217,214,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "#e7e2d8";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(36, 36, W - 72, H - 72, 36);
  ctx.stroke();

  // Seal + wordmark.
  ctx.save();
  ctx.translate(76, 72);
  ctx.scale(0.9, 0.9);
  ctx.fillStyle = "#d94b3d";
  ctx.beginPath();
  ctx.roundRect(3, 3, 58, 58, 14);
  ctx.fill();
  ctx.strokeStyle = "#faf9f6";
  ctx.lineWidth = 4.6;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const d of SEAL_GLYPH_PATHS) ctx.stroke(new Path2D(d));
  ctx.restore();
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.font = `500 38px ${mincho}`;
  ctx.fillStyle = "#242424";
  ctx.fillText("My", 148, 102);
  const my = ctx.measureText("My").width;
  ctx.fillStyle = "#b5382a";
  ctx.fillText("Namae", 148 + my, 102);

  // Name.
  ctx.textAlign = "center";
  ctx.fillStyle = "#242424";
  ctx.direction = "ltr";
  const size = fit(ctx, f.primaryText, 500, primaryFamily, f.primaryLang === "ja" ? 150 : 120, W - 200);
  ctx.font = `500 ${size}px ${primaryFamily}`;
  const nameY = f.secondaryText ? 280 : 300;
  ctx.fillText(f.primaryText, W / 2, nameY);

  let y = nameY + size * 0.55 + 30;
  if (f.secondaryText) {
    ctx.direction = f.textDirection;
    ctx.fillStyle = "#6b675f";
    const s2 = fit(ctx, f.secondaryText, 500, secondaryFamily, 56, W - 260);
    ctx.font = `500 ${s2}px ${secondaryFamily}`;
    ctx.fillText(f.secondaryText, W / 2, y);
    ctx.direction = "ltr";
    y += s2 + 14;
  }
  if (f.romanization && f.romanization !== f.primaryText) {
    ctx.fillStyle = "#6b675f";
    ctx.font = `400 28px ${serif}`;
    ctx.fillText(f.romanization, W / 2, y);
  }

  // Footer: dice components and tagline.
  ctx.fillStyle = "#6b675f";
  ctx.font = `400 24px ${sans}`;
  ctx.textAlign = "left";
  ctx.fillText(text.components.join("   +   "), 84, H - 92);
  ctx.textAlign = "right";
  ctx.fillStyle = "#b5382a";
  ctx.fillText(text.tagline, W - 84, H - 92);

  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("PNG encoding failed"))), "image/png"),
  );
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

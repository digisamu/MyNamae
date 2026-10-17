/*
 * One-shot DOM effects for the name reveal. Elements are pooled and animated with the Web Animations API,
 * so nothing loops and nothing stays in the DOM between rolls.
 */

export interface FlightItem {
  /** Viewport coordinates of the die's upward face. */
  x: number;
  y: number;
  text: string;
  lang: string;
}

function layer(id: string): HTMLElement {
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement("div");
    el.id = id;
    el.setAttribute("aria-hidden", "true");
    el.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:60;overflow:hidden";
    document.body.appendChild(el);
  }
  return el;
}

/** The upward face labels travel from the dice into the result card. */
export function launchRevealFlight(items: readonly FlightItem[], target: DOMRect): void {
  if (typeof document === "undefined" || !("animate" in HTMLElement.prototype)) return;
  const host = layer("mynamae-flight");
  const tx = target.left + Math.min(target.width / 2, 160);
  const ty = target.top + Math.min(target.height / 3, 120);
  items.forEach((item, i) => {
    const chip = document.createElement("span");
    chip.textContent = item.text;
    chip.lang = item.lang;
    chip.style.cssText =
      "position:absolute;left:0;top:0;padding:4px 12px;border-radius:999px;background:#fffdf8;border:1px solid #d6cfc2;" +
      "font:600 18px var(--font-noto-serif),var(--font-shippori),serif;color:#242424;box-shadow:0 8px 20px -10px rgb(36 36 36/.35);white-space:nowrap";
    host.appendChild(chip);
    const animation = chip.animate(
      [
        { transform: `translate(${item.x}px, ${item.y}px) translate(-50%, -50%) scale(1)`, opacity: 0 },
        { transform: `translate(${item.x}px, ${item.y - 18}px) translate(-50%, -50%) scale(1.05)`, opacity: 1, offset: 0.2 },
        { transform: `translate(${tx}px, ${ty}px) translate(-50%, -50%) scale(0.7)`, opacity: 0 },
      ],
      { duration: 480, delay: i * 70, easing: "cubic-bezier(.45,.05,.25,1)", fill: "both" },
    );
    animation.onfinish = () => chip.remove();
    animation.oncancel = () => chip.remove();
  });
}

const PETALS = 7;

/** A few sakura petals drift once over the result card. Never looped. */
export function launchPetals(target: DOMRect): void {
  if (typeof document === "undefined" || !("animate" in HTMLElement.prototype)) return;
  const host = layer("mynamae-petals");
  while (host.childElementCount < PETALS) {
    const petal = document.createElement("span");
    petal.style.cssText =
      "position:absolute;left:0;top:0;width:12px;height:9px;border-radius:100% 0 100% 0;background:#f2c9c4;opacity:0";
    host.appendChild(petal);
  }
  Array.from(host.children).forEach((node, i) => {
    const petal = node as HTMLElement;
    petal.getAnimations().forEach((a) => a.cancel());
    const startX = target.left + target.width * (0.15 + Math.random() * 0.7);
    const startY = target.top - 10 + Math.random() * 30;
    const driftX = (Math.random() - 0.3) * 120;
    const fall = 140 + Math.random() * 120;
    const spin = (Math.random() > 0.5 ? 1 : -1) * (180 + Math.random() * 240);
    petal.animate(
      [
        { transform: `translate(${startX}px, ${startY}px) rotate(0deg)`, opacity: 0 },
        { opacity: 0.9, offset: 0.15 },
        { transform: `translate(${startX + driftX}px, ${startY + fall}px) rotate(${spin}deg)`, opacity: 0 },
      ],
      { duration: 1800 + Math.random() * 700, delay: i * 90, easing: "cubic-bezier(.3,.2,.4,1)", fill: "both" },
    );
  });
}

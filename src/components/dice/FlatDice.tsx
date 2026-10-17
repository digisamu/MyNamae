"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { CULTURE_THEME } from "@/components/culture-selector/cultureTheme";
import type { DiceViewProps, ScreenPoint } from "./types";

/** Non-WebGL dice: square tiles that flick through their faces, then settle one after another. */
export function FlatDice({ dice, rollId, sceneKey, startedAt, timeline, fastForwarded, reducedMotion, onSettled }: DiceViewProps) {
  const [tick, setTick] = useState(0);
  const [settledCount, setSettledCount] = useState<{ key: string; count: number }>({ key: "", count: dice.length });
  const container = useRef<HTMLDivElement>(null);
  const tiles = useRef<(HTMLDivElement | null)[]>([]);

  const report = useEffectEvent(() => {
    const box = container.current?.getBoundingClientRect();
    const points: ScreenPoint[] = dice.map((_, i) => {
      const r = tiles.current[i]?.getBoundingClientRect();
      if (!box || !r || box.width === 0) return { x: (i + 1) / (dice.length + 1), y: 0.5 };
      return { x: (r.left + r.width / 2 - box.left) / box.width, y: (r.top - box.top) / box.height };
    });
    onSettled(sceneKey, dice.map((d) => d.targetFace), points);
  });

  useEffect(() => {
    if (rollId === null || !timeline || fastForwarded) {
      const done = window.setTimeout(() => {
        setSettledCount({ key: sceneKey, count: dice.length });
        report();
      }, 0);
      return () => window.clearTimeout(done);
    }
    const elapsed = performance.now() - startedAt;
    const timers = timeline.ends.map((end, i) =>
      window.setTimeout(() => {
        setSettledCount({ key: sceneKey, count: i + 1 });
        if (i === timeline.ends.length - 1) report();
      }, Math.max(0, end - elapsed)),
    );
    const start = window.setTimeout(() => setSettledCount({ key: sceneKey, count: 0 }), 0);
    const interval = reducedMotion ? undefined : window.setInterval(() => setTick((n) => n + 1), 85);
    return () => {
      timers.forEach((id) => window.clearTimeout(id));
      window.clearTimeout(start);
      window.clearInterval(interval);
    };
  }, [rollId, sceneKey, startedAt, timeline, fastForwarded, reducedMotion, dice.length]);

  const settled = settledCount.key === sceneKey ? settledCount.count : dice.length;

  return (
    <div ref={container} className="absolute inset-0 flex items-center justify-center gap-4 p-6 sm:gap-6">
      {dice.map((die, i) => {
        const moving = i >= settled && !die.locked;
        const face = moving ? die.faces[(tick + i * 2) % die.faces.length]! : die.faces[die.targetFace]!;
        return (
          <div
            key={i}
            ref={(el) => {
              tiles.current[i] = el;
            }}
            aria-hidden
            className={`grid aspect-square w-[28%] max-w-40 place-items-center rounded-[22%] border-2 bg-gradient-to-br from-[#fffdf9] to-[#f3eee4] p-2 text-center shadow-lift transition-transform ${
              moving ? "-translate-y-2 -rotate-6 scale-95" : ""
            }`}
            style={{ borderColor: moving ? `${CULTURE_THEME[die.culture].accent}88` : rollId !== null ? "#d94b3d" : `${CULTURE_THEME[die.culture].accent}88` }}
          >
            <div>
              <div lang={face.primaryLang} className="font-display text-xl font-semibold break-all text-ink sm:text-2xl">
                {face.primary}
              </div>
              {face.secondary && (
                <div lang={face.secondary.lang} dir={face.secondary.dir} className="mt-1 text-sm text-muted">
                  {face.secondary.text}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

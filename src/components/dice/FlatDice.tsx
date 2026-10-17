"use client";

import { useEffect, useEffectEvent, useState } from "react";
import { CULTURE_THEME } from "@/components/culture-selector/cultureTheme";
import type { DiceViewProps } from "./types";

/** Non-WebGL dice: square tiles that flick through their faces, then show the selected one. */
export function FlatDice({ dice, rollId, sceneKey, startedAt, duration, reducedMotion, onSettled }: DiceViewProps) {
  const [tick, setTick] = useState(0);
  const [rollingKey, setRollingKey] = useState<string | null>(null);
  const report = useEffectEvent(() => onSettled(sceneKey, dice.map((d) => d.targetFace)));

  useEffect(() => {
    if (rollId === null) {
      report();
      return;
    }
    const remaining = Math.max(0, startedAt + duration - performance.now());
    const start = window.setTimeout(() => setRollingKey(sceneKey), 0);
    const interval = reducedMotion ? undefined : window.setInterval(() => setTick((n) => n + 1), 85);
    const done = window.setTimeout(() => {
      window.clearInterval(interval);
      setRollingKey(null);
      report();
    }, remaining);
    return () => {
      window.clearTimeout(start);
      window.clearTimeout(done);
      window.clearInterval(interval);
    };
  }, [rollId, sceneKey, startedAt, duration, reducedMotion]);

  const rolling = rollingKey === sceneKey;

  return (
    <div className="absolute inset-0 flex items-center justify-center gap-4 p-6 sm:gap-6">
      {dice.map((die, i) => {
        const face = rolling ? die.faces[(tick + i * 2) % die.faces.length]! : die.faces[die.targetFace]!;
        return (
          <div
            key={i}
            aria-hidden
            className={`grid aspect-square w-[28%] max-w-40 place-items-center rounded-[22%] border-2 bg-gradient-to-br from-[#fffdf9] to-[#f3eee4] p-2 text-center shadow-lift transition-transform ${
              rolling ? "-rotate-3 scale-95" : ""
            }`}
            style={{ borderColor: `${CULTURE_THEME[die.culture].accent}88` }}
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

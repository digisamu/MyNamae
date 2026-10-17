import { describe, expect, it } from "vitest";
import { defaultRegistry } from "@/data/cultures";
import { formatGeneratedName } from "@/features/formatting/formatName";
import { EN_LATIN_PATTERN } from "@/features/formatting/enLatin";
import { createSeededRandom } from "@/lib/random";
import type { RollOutcome } from "@/types/generation";
import type { CultureId } from "@/types/names";
import { establishedCandidates, generateName } from "./generate";

function roll(dice: CultureId[], mode: "creative" | "established", seed: number, locked?: RollOutcome["dice"][number][] | (RollOutcome["dice"][number] | null)[], style?: "any" | "f" | "m" | "u") {
  const res = generateName({ dice, mode }, { rng: createSeededRandom(seed), locked, style });
  if (!res.ok) throw new Error(`generation failed: ${res.reason}`);
  return res.outcome;
}

describe("lock and reroll", () => {
  it("keeps a locked die's component, faces and face index while rerolling the others", () => {
    const first = roll(["turkic", "japanese", "arabic"], "creative", 3);
    for (let seed = 10; seed < 40; seed++) {
      const next = roll(["turkic", "japanese", "arabic"], "creative", seed, [first.dice[0]!, null, first.dice[2]!]);
      expect(next.dice[0]).toEqual(first.dice[0]);
      expect(next.dice[2]).toEqual(first.dice[2]);
      expect(next.result.components[0]!.componentId).toBe(first.dice[0]!.componentId);
      expect(next.result.components[2]!.componentId).toBe(first.dice[2]!.componentId);
      // The visible face still carries the result.
      next.dice.forEach((d, i) => expect(d.faces[d.faceIndex]).toBe(next.result.components[i]!.componentId));
    }
  });

  it("re-evaluates the writing system for the new combination", () => {
    // Lock a Turkic die, then reroll the other die as Japanese: the name becomes English Latin.
    const pure = roll(["turkic", "turkic"], "creative", 5);
    expect(formatGeneratedName(pure.result)!.latinSystem).toBe("az-latin");
    const mixed = roll(["turkic", "japanese"], "creative", 6, [pure.dice[0]!, null]);
    expect(mixed.result.components[0]!.componentId).toBe(pure.dice[0]!.componentId);
    const formatted = formatGeneratedName(mixed.result)!;
    expect(formatted.latinSystem).toBe("en-latin");
    expect(formatted.primaryText).toMatch(EN_LATIN_PATTERN);
  });

  it("ignores a lock whose culture no longer matches the die", () => {
    const pure = roll(["turkic", "turkic"], "creative", 7);
    const next = roll(["japanese", "japanese"], "creative", 8, [pure.dice[0]!, null]);
    expect(next.result.components[0]!.culture).toBe("japanese");
  });

  it("drops a locked bound Arabic element when the name becomes mixed", () => {
    const abd = { index: 0, culture: "arabic" as const, componentId: "ar-abd-al", faces: Array(6).fill("ar-abd-al"), faceIndex: 0 };
    const next = roll(["arabic", "japanese"], "creative", 9, [abd, null]);
    expect(next.result.components[0]!.componentId).not.toBe("ar-abd-al");
  });

  it("keeps established mode for locked segments when a curated name fits", () => {
    const ay = { index: 0, culture: "turkic" as const, componentId: "tr-ay", faces: Array(6).fill("tr-ay"), faceIndex: 2 };
    for (let seed = 1; seed < 20; seed++) {
      const next = roll(["turkic", "turkic"], "established", seed, [ay, null]);
      expect(next.result.mode).toBe("established");
      expect(defaultRegistry.nameById.get(next.result.curatedNameId!)!.segments![0]).toBe("tr-ay");
    }
  });
});

describe("name style filter", () => {
  it("filters established names by recorded gender only", () => {
    const feminine = establishedCandidates(["turkic", "turkic"], defaultRegistry, "f");
    expect(feminine.length).toBeGreaterThan(5);
    expect(feminine.every((n) => n.gender === "f")).toBe(true);
    for (let seed = 1; seed < 25; seed++) {
      const r = roll(["turkic", "turkic"], "established", seed, undefined, "m");
      expect(defaultRegistry.nameById.get(r.result.curatedNameId!)!.gender).toBe("m");
    }
  });

  it("never applies to creative names, and Japanese names have no gender data to filter", () => {
    expect(establishedCandidates(["japanese", "japanese"], defaultRegistry, "f")).toEqual([]);
    const r = roll(["japanese", "japanese"], "established", 2, undefined, "f");
    expect(r.result.mode).toBe("creative");
  });
});

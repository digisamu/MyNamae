import { describe, expect, it } from "vitest";
import { createRegistry, defaultRegistry } from "@/data/cultures";
import { arabicCulture } from "@/data/cultures/arabic";
import { japaneseCulture } from "@/data/cultures/japanese";
import { turkicCulture } from "@/data/cultures/turkic";
import { EN_LATIN_PATTERN } from "@/features/formatting/enLatin";
import { formatGeneratedName } from "@/features/formatting/formatName";
import { createSeededRandom } from "@/lib/random";
import type { RollOutcome } from "@/types/generation";
import type { CultureId } from "@/types/names";
import { diceForCultures, validateDiceConfig } from "./config";
import {
  establishedCandidates,
  fitsSlot,
  generateName,
  signatureOf,
  slotFor,
} from "./generate";

function roll(dice: CultureId[], mode: "creative" | "established", seed: number): RollOutcome {
  const res = generateName({ dice, mode }, { rng: createSeededRandom(seed), now: () => 0, createId: () => `id-${seed}` });
  if (!res.ok) throw new Error(`generation failed: ${res.reason}`);
  return res.outcome;
}

const component = (id: string) => defaultRegistry.componentById.get(id)!;

describe("dice configuration", () => {
  it("never accepts a single die", () => {
    expect(validateDiceConfig(["turkic"])).toEqual({ ok: false, issue: "too-few-dice" });
    const res = generateName({ dice: ["japanese"], mode: "creative" });
    expect(res.ok).toBe(false);
  });

  it("rejects more than three dice and unknown cultures", () => {
    expect(validateDiceConfig(["turkic", "arabic", "japanese", "turkic"]).ok).toBe(false);
    expect(validateDiceConfig(["turkic", "elvish"]).ok).toBe(false);
  });

  it("requires exactly two dice for a single culture", () => {
    expect(validateDiceConfig(["arabic", "arabic", "arabic"])).toEqual({
      ok: false,
      issue: "single-culture-needs-two-dice",
    });
  });

  it("maps a selection of cultures to dice", () => {
    expect(diceForCultures(["japanese"])).toEqual(["japanese", "japanese"]);
    expect(diceForCultures(["turkic", "japanese"])).toEqual(["turkic", "japanese"]);
    expect(diceForCultures(["turkic", "arabic", "japanese"])).toHaveLength(3);
    // Keeps a valid custom arrangement of the same cultures.
    expect(diceForCultures(["turkic", "japanese"], ["japanese", "turkic", "turkic"])).toEqual([
      "japanese",
      "turkic",
      "turkic",
    ]);
  });
});

describe("single-culture generation", () => {
  it.each(["turkic", "arabic", "japanese"] as const)(
    "%s always uses exactly two dice components",
    (culture) => {
      for (let seed = 1; seed <= 60; seed++) {
        for (const mode of ["creative", "established"] as const) {
          const { result, dice } = roll([culture, culture], mode, seed);
          expect(result.components).toHaveLength(2);
          expect(dice).toHaveLength(2);
          expect(result.components.every((c) => c.culture === culture)).toBe(true);
        }
      }
    },
  );
});

describe("positional rules", () => {
  it("respects initial / final / any on every die", () => {
    const configs: CultureId[][] = [
      ["turkic", "turkic"],
      ["japanese", "japanese"],
      ["arabic", "arabic"],
      ["turkic", "japanese"],
      ["arabic", "turkic", "japanese"],
      ["japanese", "japanese", "arabic"],
    ];
    for (const dice of configs) {
      for (let seed = 1; seed <= 40; seed++) {
        const { result } = roll(dice, "creative", seed);
        result.components.forEach((ref, i) => {
          expect(fitsSlot(component(ref.componentId), slotFor(i, dice.length))).toBe(true);
        });
      }
    }
  });

  it("only places 'any' components on a middle die", () => {
    for (let seed = 1; seed <= 40; seed++) {
      const { result } = roll(["turkic", "arabic", "japanese"], "creative", seed);
      expect(component(result.components[1]!.componentId).position).toBe("any");
    }
  });
});

describe("dice outcomes", () => {
  it("each die shows its selected component on the selected face, among six valid faces", () => {
    for (let seed = 1; seed <= 50; seed++) {
      const { result, dice } = roll(["turkic", "japanese"], "creative", seed);
      dice.forEach((die, i) => {
        expect(die.faces).toHaveLength(6);
        expect(die.faces[die.faceIndex]).toBe(die.componentId);
        expect(result.components[i]!.componentId).toBe(die.componentId);
        for (const face of die.faces) {
          const c = component(face);
          expect(c.culture).toBe(die.culture);
          expect(fitsSlot(c, slotFor(i, dice.length))).toBe(true);
        }
      });
    }
  });

  it("derives the displayed name from the dice outcomes", () => {
    for (let seed = 1; seed <= 30; seed++) {
      const { result } = roll(["arabic", "japanese"], "creative", seed);
      expect(formatGeneratedName(result)!.primaryText).toBe(result.displayName);
    }
  });
});

describe("established mode", () => {
  it("selects curated, segmented names whose segments land on the dice", () => {
    for (const culture of ["turkic", "arabic", "japanese"] as const) {
      for (let seed = 1; seed <= 30; seed++) {
        const { result, dice } = roll([culture, culture], "established", seed);
        expect(result.mode).toBe("established");
        const name = defaultRegistry.nameById.get(result.curatedNameId!)!;
        expect(name.segments).toEqual(dice.map((d) => d.componentId));
      }
    }
  });

  it("displays the curated spelling, not the concatenation of segments", () => {
    // Abd + Allah would concatenate to "AbdAllah"; Fadl + Allah mechanically joins to "Fadlullah".
    const seen = new Map<string, string>();
    for (let seed = 1; seed <= 400; seed++) {
      const { result } = roll(["arabic", "arabic"], "established", seed);
      seen.set(result.curatedNameId!, result.displayName);
    }
    expect(seen.get("arn-abdullah")).toBe("Abdullah");
    expect(seen.get("arn-fadlallah")).toBe("Fadlallah");

    for (let seed = 1; seed <= 200; seed++) {
      const { result } = roll(["japanese", "japanese"], "established", seed);
      if (result.curatedNameId === "jan-haruto") expect(result.displayName).toBe("陽翔");
    }
  });

  it("excludes names marked as unsegmentable", () => {
    const ids = establishedCandidates(["japanese", "japanese"]).map((n) => n.id);
    expect(ids).not.toContain("jan-ren");
    expect(ids).not.toContain("jan-yamato");
  });

  it("falls back to creative mode for mixed configurations", () => {
    const { result } = roll(["turkic", "japanese"], "established", 5);
    expect(result.mode).toBe("creative");
    expect(result.requestedMode).toBe("established");
    expect(result.explanation).toBe("established-unavailable-mixed");
  });
});

describe("creative mode", () => {
  it("recognises a creative roll that spells a curated name", () => {
    let matched = 0;
    for (let seed = 1; seed <= 400; seed++) {
      const { result } = roll(["japanese", "japanese"], "creative", seed);
      if (result.explanation === "creative-matched") {
        matched++;
        const name = defaultRegistry.nameById.get(result.curatedNameId!)!;
        expect(name.culture === "japanese" && result.displayName === (name.kanji ?? name.hiragana)).toBe(true);
      }
    }
    expect(matched).toBeGreaterThan(0);
  });

  it("only produces structurally valid pure-Arabic pairs", () => {
    for (let seed = 1; seed <= 200; seed++) {
      const { result } = roll(["arabic", "arabic"], "creative", seed);
      expect(formatGeneratedName(result)).not.toBeNull();
    }
  });

  it("never places a bound component in a mixed name", () => {
    for (let seed = 1; seed <= 200; seed++) {
      const { result } = roll(["arabic", "japanese"], "creative", seed);
      for (const ref of result.components) expect(component(ref.componentId).bound).toBeFalsy();
    }
  });

  it("produces two-culture and three-culture names in plain English Latin", () => {
    const configs: CultureId[][] = [
      ["turkic", "japanese"],
      ["arabic", "japanese"],
      ["turkic", "arabic"],
      ["turkic", "arabic", "japanese"],
      ["japanese", "turkic", "turkic"],
    ];
    for (const dice of configs) {
      for (let seed = 1; seed <= 80; seed++) {
        const { result } = roll(dice, "creative", seed);
        expect(result.components).toHaveLength(dice.length);
        expect(result.components.map((c) => c.culture)).toEqual(dice);
        expect(result.displayName).toMatch(EN_LATIN_PATTERN);
      }
    }
  });

  it("disallows identical components on adjacent dice", () => {
    for (let seed = 1; seed <= 300; seed++) {
      const { result } = roll(["turkic", "turkic"], "creative", seed);
      expect(result.components[0]!.componentId).not.toBe(result.components[1]!.componentId);
    }
  });

  it("avoids recent results where practical", () => {
    const first = roll(["turkic", "turkic"], "creative", 11).result;
    const avoid = new Set([signatureOf(first.components.map((c) => c.componentId))]);
    const res = generateName({ dice: ["turkic", "turkic"], mode: "creative" }, { rng: createSeededRandom(11), avoid });
    expect(res.ok && signatureOf(res.outcome.result.components.map((c) => c.componentId))).not.toBe(
      [...avoid][0],
    );
  });

  it("reaches many distinct outcomes", () => {
    const names = new Set<string>();
    for (let seed = 1; seed <= 200; seed++) names.add(roll(["turkic", "japanese"], "creative", seed).result.displayName);
    expect(names.size).toBeGreaterThan(120);
  });
});

describe("invalid and empty dictionaries", () => {
  it("fails safely when a culture has no components", () => {
    const registry = createRegistry([
      { ...turkicCulture, components: [], names: [] },
      arabicCulture,
      japaneseCulture,
    ]);
    const res = generateName({ dice: ["turkic", "turkic"], mode: "creative" }, { registry });
    expect(res).toEqual({ ok: false, reason: "no-valid-combination" });
  });

  it("falls back to creative when no curated names fit", () => {
    const registry = createRegistry([{ ...turkicCulture, names: [] }, arabicCulture, japaneseCulture]);
    const res = generateName(
      { dice: ["turkic", "turkic"], mode: "established" },
      { registry, rng: createSeededRandom(1) },
    );
    expect(res.ok && res.outcome.result.mode).toBe("creative");
  });

  it("fails safely when no pair satisfies the structural rules", () => {
    const registry = createRegistry([
      turkicCulture,
      { ...arabicCulture, components: arabicCulture.components.filter((c) => c.id === "ar-abd" || c.id === "ar-layla") },
      japaneseCulture,
    ]);
    const res = generateName({ dice: ["arabic", "arabic"], mode: "creative" }, { registry });
    expect(res.ok).toBe(false);
  });
});

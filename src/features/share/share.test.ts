import { describe, expect, it } from "vitest";
import { formatGeneratedName, type FormattedName } from "@/features/formatting/formatName";
import { dailyCandidates, dayKey, nameOfTheDay } from "@/features/generation/nameOfTheDay";
import { generateName } from "@/features/generation/generate";
import { pickVoice, pronunciationTarget } from "@/features/speech/pronunciation";
import { createSeededRandom } from "@/lib/random";
import type { CultureId } from "@/types/names";
import { resultFromShare, rollForResult, shareParams, shareUrl } from "./shareLink";

function rolled(dice: CultureId[], mode: "creative" | "established", seed: number) {
  const res = generateName({ dice, mode }, { rng: createSeededRandom(seed) });
  if (!res.ok) throw new Error("generation failed");
  return res.outcome.result;
}

describe("share links", () => {
  it("encode only component ids and the mode", () => {
    const result = rolled(["turkic", "turkic"], "established", 4);
    const params = shareParams(result);
    expect([...params.keys()]).toEqual(["r", "m"]);
    expect(params.get("m")).toBe("e");
    expect(shareUrl(result, "https://example.test")).toMatch(/^https:\/\/example\.test\/\?r=tr-[a-z]+\.tr-[a-z]+&m=e$/);
  });

  it("restore the same result card for every kind of roll", () => {
    const configs: [CultureId[], "creative" | "established"][] = [
      [["turkic", "turkic"], "established"],
      [["arabic", "arabic"], "established"],
      [["japanese", "japanese"], "creative"],
      [["turkic", "arabic", "japanese"], "creative"],
    ];
    for (const [dice, mode] of configs) {
      for (let seed = 1; seed <= 15; seed++) {
        const original = rolled(dice, mode, seed);
        const params = shareParams(original);
        const restored = resultFromShare(params.get("r"), params.get("m"))!;
        expect(restored.components).toEqual(original.components);
        expect(restored.curatedNameId).toEqual(original.curatedNameId);
        expect(formatGeneratedName(restored)!.primaryText).toBe(formatGeneratedName(original)!.primaryText);
      }
    }
  });

  it("reject tampered or invalid parameters", () => {
    expect(resultFromShare(null, "e")).toBeNull();
    expect(resultFromShare("tr-ay", "e")).toBeNull(); // a single die is never a name
    expect(resultFromShare("tr-ay.tr-nope", "c")).toBeNull();
    expect(resultFromShare("ar-abd.ar-layla", "c")).toBeNull(); // no Arabic structure for this pair
    expect(resultFromShare("tr-xan.tr-ay", "c")).toBeNull(); // a final component on the first die
    expect(resultFromShare("ar-abd-al.ja-haru", "c")).toBeNull(); // bound element in a mixed name
    expect(resultFromShare("x".repeat(500), "c")).toBeNull();
  });

  it("builds dice whose faces show the shared components", () => {
    const result = resultFromShare("tr-ay.tr-xan", "e")!;
    const roll = rollForResult(result);
    roll.dice.forEach((die, i) => expect(die.faces[die.faceIndex]).toBe(result.components[i]!.componentId));
    expect(formatGeneratedName(result)!.primaryText).toBe("Ayxan");
  });
});

describe("name of the day", () => {
  it("is the same for everyone on a given UTC day and changes across days", () => {
    const a = nameOfTheDay(new Date("2026-10-17T01:00:00Z"));
    const b = nameOfTheDay(new Date("2026-10-17T23:00:00Z"));
    expect(a.curatedNameId).toBe(b.curatedNameId);
    const week = new Set(
      Array.from({ length: 14 }, (_, i) => nameOfTheDay(new Date(Date.UTC(2026, 9, 1 + i))).curatedNameId),
    );
    expect(week.size).toBeGreaterThan(5);
    expect(dayKey(new Date("2026-10-17T12:00:00Z"))).toBe("2026-10-17");
  });

  it("only picks curated, segmented names and formats them as established", () => {
    const ids = new Set(dailyCandidates().map((n) => n.id));
    for (let d = 0; d < 40; d++) {
      const daily = nameOfTheDay(new Date(Date.UTC(2026, 0, 1 + d)));
      expect(ids.has(daily.curatedNameId!)).toBe(true);
      expect(formatGeneratedName(daily)!.linguisticStatus).toBe("established");
    }
  });
});

describe("pronunciation", () => {
  const f = (ids: string, mode = "e") => formatGeneratedName(resultFromShare(ids, mode)!)! as FormattedName;

  it("chooses the voice language from the writing system", () => {
    expect(pronunciationTarget(f("ja-ta.ja-naka"))).toEqual({ text: "たなか", langs: ["ja"] });
    expect(pronunciationTarget(f("ar-abd.ar-allah"))).toEqual({ text: "عبد الله", langs: ["ar"] });
    expect(pronunciationTarget(f("tr-ay.tr-xan"))).toEqual({ text: "Ayxan", langs: ["az", "tr"] });
    expect(pronunciationTarget(f("tr-bey.ja-haru", "c"))).toEqual({ text: "BeyHaru", langs: ["en"] });
  });

  it("falls back from Azerbaijani to Turkish voices, and reports no voice when none fits", () => {
    const voices = [
      { lang: "en-US", name: "A" },
      { lang: "tr-TR", name: "B" },
      { lang: "ja_JP", name: "C" },
    ];
    expect(pickVoice(voices, ["az", "tr"])?.name).toBe("B");
    expect(pickVoice(voices, ["ja"])?.name).toBe("C");
    expect(pickVoice(voices, ["ar"])).toBeNull();
    expect(pickVoice([], ["en"])).toBeNull();
  });
});

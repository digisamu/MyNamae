import { describe, expect, it } from "vitest";
import { validateRegistry } from "@/lib/validation/dictionary";
import { createRegistry, defaultRegistry } from "./index";
import { turkicCulture } from "./turkic";
import type { CultureDefinition, NameComponent } from "@/types/names";

describe("cultural dictionaries", () => {
  it("pass validation", () => {
    expect(validateRegistry(defaultRegistry)).toEqual([]);
  });

  it("are substantially larger than the specification examples", () => {
    for (const def of Object.values(defaultRegistry.cultures)) {
      expect(def.components.length).toBeGreaterThanOrEqual(35);
      expect(def.names.filter((n) => n.segments !== null).length).toBeGreaterThanOrEqual(30);
    }
  });

  it("gives every Turkic entry an enLatin spelling or a review flag", () => {
    for (const entry of [...turkicCulture.components, ...turkicCulture.names]) {
      if (entry.culture !== "turkic") continue;
      expect(entry.enLatin !== undefined || entry.reviewFlags?.includes("enLatin-fallback")).toBe(true);
    }
  });

  it("gives every component a position and every curated name a segmentation or exclusion", () => {
    for (const def of Object.values(defaultRegistry.cultures)) {
      for (const c of def.components) expect(["initial", "final", "any"]).toContain(c.position);
      for (const n of def.names) {
        if (n.segments === null) expect(n.exclusionReason).toBeTruthy();
        else expect(n.segments.length).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it("includes the reference examples", () => {
    const has = (id: string) => defaultRegistry.componentById.has(id);
    for (const id of ["tr-ay", "tr-xan", "tr-bey", "tr-alp", "tr-gul", "tr-can", "tr-deniz", "tr-tural", "tr-altay"]) {
      expect(has(id)).toBe(true);
    }
    for (const id of ["ar-abd", "ar-abd-al", "ar-nur", "ar-din", "ar-zayn", "ar-layla", "ar-rahman"]) {
      expect(has(id)).toBe(true);
    }
    for (const id of ["ja-haru", "ja-ren", "ja-sora", "ja-take", "ja-hiro", "ja-naka", "ja-taki"]) {
      expect(has(id)).toBe(true);
    }
  });

  describe("validation catches malformed entries", () => {
    const broken = (patch: Partial<CultureDefinition>) =>
      validateRegistry(
        createRegistry([
          { ...turkicCulture, ...patch },
          defaultRegistry.cultures.arabic,
          defaultRegistry.cultures.japanese,
        ]),
      );

    it("flags a missing enLatin without a review flag", () => {
      const issues = broken({
        components: [
          ...turkicCulture.components,
          { id: "tr-test", culture: "turkic", azLatin: "Şir", position: "any", confidence: "reviewed" },
        ],
      });
      expect(issues.some((i) => i.includes("tr-test") && i.includes("enLatin"))).toBe(true);
    });

    it("flags an invalid position", () => {
      const issues = broken({
        components: [
          ...turkicCulture.components,
          // Deliberately malformed: "middle" is not a valid position.
          { id: "tr-bad", culture: "turkic", azLatin: "Ok", enLatin: "Ok", position: "middle", confidence: "reviewed" } as unknown as NameComponent,
        ],
      });
      expect(issues.some((i) => i.includes("tr-bad") && i.includes("position"))).toBe(true);
    });

    it("flags a curated name split at a boundary that does not reproduce it", () => {
      const issues = broken({
        names: [
          ...turkicCulture.names,
          { id: "trn-wrong", culture: "turkic", azLatin: "Aysel", enLatin: "Aysel", segments: ["tr-ay", "tr-xan"], confidence: "reviewed" },
        ],
      });
      expect(issues.some((i) => i.includes("trn-wrong"))).toBe(true);
    });

    it("flags an unsegmented name without an exclusion reason", () => {
      const issues = broken({
        names: [
          ...turkicCulture.names,
          { id: "trn-x", culture: "turkic", azLatin: "Ox", enLatin: "Okh", segments: null, confidence: "reviewed" },
        ],
      });
      expect(issues.some((i) => i.includes("trn-x") && i.includes("exclusionReason"))).toBe(true);
    });
  });
});

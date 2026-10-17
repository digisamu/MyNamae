import { describe, expect, it } from "vitest";
import { defaultRegistry } from "@/data/cultures";
import type { NameResult } from "@/types/generation";
import type { CultureId } from "@/types/names";
import { azCapitalize, azLatinToEnLatinFallback, azLowerCase } from "./azerbaijani";
import { EN_LATIN_PATTERN, toEnLatin } from "./enLatin";
import { formatGeneratedName } from "./formatName";
import { kanaToHepburn, stripMacrons } from "./japanese";

type Draft = Pick<NameResult, "components" | "curatedNameId" | "explanation">;

function draft(ids: string[], extra: Partial<Draft> = {}): Draft {
  return {
    components: ids.map((id) => ({
      componentId: id,
      culture: defaultRegistry.componentById.get(id)!.culture as CultureId,
    })),
    explanation: "creative",
    ...extra,
  };
}

const format = (ids: string[], extra?: Partial<Draft>) => formatGeneratedName(draft(ids, extra))!;

describe("Azerbaijani helpers", () => {
  it("lower- and upper-cases dotted and dotless i correctly", () => {
    expect(azLowerCase("İLXAN")).toBe("ilxan");
    expect(azLowerCase("I")).toBe("ı");
    expect(azCapitalize("ilxan")).toBe("İlxan");
    expect(azCapitalize("ırmaq")).toBe("Irmaq");
  });

  it.each([
    ["Ə", "A"], ["ə", "a"], ["X", "Kh"], ["x", "kh"], ["Ş", "Sh"], ["ş", "sh"],
    ["Ç", "Ch"], ["ç", "ch"], ["Ğ", "Gh"], ["ğ", "gh"], ["Q", "G"], ["q", "g"],
    ["C", "J"], ["c", "j"], ["J", "Zh"], ["j", "zh"], ["I", "I"], ["ı", "i"],
    ["İ", "I"], ["i", "i"], ["Ö", "O"], ["ö", "o"], ["Ü", "U"], ["ü", "u"],
  ])("maps %s → %s in the enLatin fallback", (az, en) => {
    expect(azLatinToEnLatinFallback(az)).toBe(en);
  });

  it("does not chain mappings (c → j must not become zh)", () => {
    expect(azLatinToEnLatinFallback("Cəmilə")).toBe("Jamila");
    expect(azLatinToEnLatinFallback("Jalə")).toBe("Zhala");
  });

  it("prefers curated enLatin over the fallback (Dəniz → Deniz)", () => {
    const deniz = defaultRegistry.componentById.get("tr-deniz")!;
    expect(azLatinToEnLatinFallback("Dəniz")).toBe("Daniz");
    expect(toEnLatin(deniz)).toBe("Deniz");
  });

  it("falls back for entries flagged for review", () => {
    const oguz = defaultRegistry.componentById.get("tr-oguz")!;
    expect(oguz.culture === "turkic" && oguz.enLatin).toBeFalsy();
    expect(toEnLatin(oguz)).toBe("Oghuz");
  });
});

describe("Japanese helpers", () => {
  it("strips macrons", () => {
    expect(stripMacrons("Yūki")).toBe("Yuki");
    expect(stripMacrons("Kōji Shōta")).toBe("Koji Shota");
  });

  it("converts kana to Hepburn", () => {
    expect(kanaToHepburn("しょう")).toBe("shō");
    expect(kanaToHepburn("けんいち")).toBe("ken'ichi");
    expect(kanaToHepburn("まっちゃ")).toBe("matcha");
    expect(kanaToHepburn("abc")).toBeNull();
  });
});

describe("Rule A: pure Japanese", () => {
  it("shows verified kanji with the matching hiragana reading", () => {
    const f = format(["ja-ta", "ja-naka"], { curatedNameId: "jan-tanaka", explanation: "established" });
    expect(f.primaryText).toBe("田中");
    expect(f.secondaryText).toBe("たなか");
    expect(f.scriptType).toBe("kanji");
    expect(f.secondaryScript).toBe("hiragana");
    expect(f.romanization).toBe("Tanaka");
    expect(f.latinSystem).toBe("hepburn");
    expect(f.linguisticStatus).toBe("established");
  });

  it("falls back to hiragana for creative combinations", () => {
    const f = format(["ja-taki", "ja-ko"]);
    expect(f.primaryText).toBe("たきこ");
    expect(f.scriptType).toBe("hiragana");
    expect(f.secondaryText).toBeNull();
    expect(f.romanization).toBe("Takiko");
    expect(f.linguisticStatus).toBe("creative");
  });

  it("never composes kanji from components, even when every part appears in some curated name", () => {
    // 高 (taka) appears in 高橋 and 子 (ko) in 花子, but たかこ has no curated entry here.
    const f = format(["ja-taka", "ja-ko"]);
    expect(f.primaryText).toBe("たかこ");
    expect(/[一-鿿]/.test(f.primaryText)).toBe(false);
  });

  it("adds the Hepburn apostrophe after ん before a vowel", () => {
    expect(format(["ja-ken", "ja-ichi"]).romanization).toBe("Ken'ichi");
  });
});

describe("Rule B: pure Turkic", () => {
  it("shows Azerbaijani Latin with Azerbaijani Cyrillic beneath", () => {
    const f = format(["tr-ay", "tr-xan"], { curatedNameId: "trn-aykhan", explanation: "established" });
    expect(f.primaryText).toBe("Ayxan");
    expect(f.secondaryText).toBe("Ајхан");
    expect(f.secondaryScript).toBe("az-cyrillic");
    expect(f.secondaryLang).toBe("az-Cyrl");
    expect(f.latinSystem).toBe("az-latin");
  });

  it("preserves Azerbaijani letters in creative names", () => {
    const f = format(["tr-gul", "tr-shen"]);
    expect(f.primaryText).toBe("Gülşən");
    const g = format(["tr-il", "tr-bey"]);
    expect(g.primaryText).toBe("İlbəy");
    expect(g.secondaryText).toBe("Илбәј");
  });

  it("marks Cyrillic as unavailable instead of guessing when a component has no reviewed form", () => {
    const registry = {
      ...defaultRegistry,
      componentById: new Map(defaultRegistry.componentById).set("tr-xan", {
        ...(defaultRegistry.componentById.get("tr-xan") as object),
        azCyrillic: undefined,
      } as never),
    };
    const f = formatGeneratedName(draft(["tr-alp", "tr-xan"]), registry)!;
    expect(f.primaryText).toBe("Alpxan");
    expect(f.secondaryText).toBeNull();
    expect(f.secondaryUnavailable).toBe("az-cyrillic");
  });
});

describe("Rule C: pure Arabic", () => {
  it("shows Latin with right-to-left Arabic script beneath", () => {
    const f = format(["ar-abd", "ar-allah"], { curatedNameId: "arn-abdullah", explanation: "established" });
    expect(f.primaryText).toBe("Abdullah");
    expect(f.secondaryText).toBe("عبد الله");
    expect(f.textDirection).toBe("rtl");
    expect(f.secondaryLang).toBe("ar");
    expect(f.romanization).toBe("ʿAbd Allāh");
  });

  it("preserves the article structure of Abd al- names", () => {
    const f = format(["ar-abd-al", "ar-rahman"]);
    expect(f.primaryText).toBe("Abd al-Rahman");
    expect(f.secondaryText).toBe("عبد الرحمن");
  });

  it("uses the curated conventional spelling when it differs from the mechanical join", () => {
    const f = format(["ar-fadl", "ar-allah"], { curatedNameId: "arn-fadlallah", explanation: "creative-matched" });
    expect(f.primaryText).toBe("Fadlallah");
  });

  it("returns null for an Arabic pair with no structural rule", () => {
    expect(formatGeneratedName(draft(["ar-abd", "ar-layla"]))).toBeNull();
  });
});

describe("Rule D: cross-cultural names", () => {
  const cases: [string[], string][] = [
    [["tr-ay", "ja-naka"], "AyNaka"],
    [["tr-bey", "ja-haru"], "BeyHaru"],
    [["ar-nur", "ja-haru"], "NurHaru"],
    [["ar-zayn", "tr-xan"], "ZaynKhan"],
    [["tr-gul", "ar-nur", "ja-sora"], "GulNurSora"],
    [["ja-yuu", "tr-deniz"], "YuDeniz"],
    [["tr-shen", "ja-kou"], "ShanKo"],
  ];

  it.each(cases)("%j → %s", (ids, expected) => {
    const f = format(ids);
    expect(f.primaryText).toBe(expected);
    expect(f.scriptType).toBe("en-latin");
    expect(f.latinSystem).toBe("en-latin");
    expect(f.secondaryText).toBeNull();
    expect(f.romanization).toBeNull();
  });

  it("only ever contains plain ASCII Latin for every unbound component pair", () => {
    const unbound = [...defaultRegistry.componentById.values()].filter((c) => !c.bound);
    for (const a of unbound) {
      for (const b of unbound) {
        if (a.culture === b.culture) continue;
        const f = format([a.id, b.id]);
        expect(f.primaryText, `${a.id}+${b.id}`).toMatch(EN_LATIN_PATTERN);
        expect(f.primaryText).not.toMatch(/[əıİğşçöüÇŞĞÖÜƏ]/);
      }
    }
  });

  it("is independent of interface language (pure function of the components)", () => {
    expect(format(["tr-bey", "ja-yuki"]).primaryText).toBe(format(["tr-bey", "ja-yuki"]).primaryText);
  });

  it("keeps original orthography only as separate component metadata", () => {
    const f = format(["tr-bey", "ja-haru"]);
    expect(f.components.map((c) => c.label)).toEqual(["Bəy", "Haru"]);
    expect(f.primaryText).toBe("BeyHaru");
  });
});

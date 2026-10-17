import type {
  ComponentPosition,
  CultureDefinition,
  Gender,
  TurkicComponent,
  TurkicName,
} from "@/types/names";

/*
 * Turkic dictionary, following Azerbaijani naming conventions and orthography.
 *
 * azCyrillic uses the Azerbaijani Cyrillic alphabet (1958–1991): y → ј, g → ҝ, q → г, c → ҹ, ğ → ғ,
 * h → һ, ı → ы, ə → ә, ö → ө, ü → ү. It is not Russian or Kazakh transcription, so "Ayxan" is "Ајхан".
 *
 * enLatin is the plain spelling used only in cross-cultural names. Entries without a curated enLatin
 * carry the "enLatin-fallback" review flag and use the passport-style fallback mapping.
 *
 * Several entries are of Persian or Arabic origin but long established in Azerbaijani usage (Mir, Xuda, Əli).
 */

function c(
  id: string,
  azLatin: string,
  azCyrillic: string,
  enLatin: string | null,
  position: ComponentPosition,
  note?: string,
): TurkicComponent {
  return {
    id: `tr-${id}`,
    culture: "turkic",
    azLatin,
    azCyrillic,
    ...(enLatin ? { enLatin } : { reviewFlags: ["enLatin-fallback"] as const }),
    position,
    confidence: enLatin ? "reviewed" : "needs-review",
    ...(note ? { note } : {}),
  };
}

export const turkicComponents: readonly TurkicComponent[] = [
  c("ay", "Ay", "Ај", "Ay", "any", "moon"),
  c("el", "El", "Ел", "El", "any", "people, land"),
  c("il", "İl", "Ил", "Il", "initial", "realm, people"),
  c("gul", "Gül", "Ҝүл", "Gul", "any", "rose"),
  c("gun", "Gün", "Ҝүн", "Gun", "any", "sun, day"),
  c("nur", "Nur", "Нур", "Nur", "any", "light"),
  c("alp", "Alp", "Алп", "Alp", "initial", "hero"),
  c("ar", "Ar", "Ар", "Ar", "initial"),
  c("can", "Can", "Ҹан", "Jan", "any", "soul; also written Jan in English"),
  c("mir", "Mir", "Мир", "Mir", "any", "emir (Persian origin)"),
  c("bey", "Bəy", "Бәј", "Bey", "any", "lord, chief"),
  c("deniz", "Dəniz", "Дәниз", "Deniz", "any", "sea"),
  c("tural", "Tural", "Турал", "Tural", "initial"),
  c("altay", "Altay", "Алтај", "Altay", "initial", "Altai mountains"),
  c("tanri", "Tanrı", "Танры", "Tanri", "initial", "God"),
  c("xuda", "Xuda", "Худа", "Khuda", "initial", "God (Persian origin)"),
  c("ulu", "Ulu", "Улу", "Ulu", "initial", "great"),
  c("oguz", "Oğuz", "Оғуз", null, "initial"),
  c("aga", "Ağa", "Аға", null, "initial", "elder, master"),
  c("araz", "Araz", "Араз", "Araz", "initial", "the Araz river"),
  c("ulduz", "Ulduz", "Улдуз", "Ulduz", "any", "star"),
  c("toghrul", "Toğrul", "Тоғрул", "Toghrul", "initial"),
  c("xan", "Xan", "Хан", "Khan", "final", "khan, ruler"),
  c("ten", "Tən", "Тән", null, "final", "body"),
  c("shen", "Şən", "Шән", null, "final", "joyful"),
  c("sel", "Sel", "Сел", "Sel", "final", "stream"),
  c("dan", "Dan", "Дан", "Dan", "final", "dawn"),
  c("nar", "Nar", "Нар", "Nar", "final", "pomegranate"),
  c("aslan", "Aslan", "Аслан", "Aslan", "final", "lion"),
  c("polad", "Polad", "Полад", "Polad", "final", "steel"),
  c("su", "Su", "Су", "Su", "final", "water"),
  c("beniz", "Bəniz", "Бәниз", null, "final", "face, complexion"),
  c("tac", "Tac", "Таҹ", "Taj", "final", "crown"),
  c("verdi", "Verdi", "Верди", "Verdi", "final", "gave"),
  c("shad", "Şad", "Шад", "Shad", "final", "glad"),
  c("ali", "Əli", "Әли", "Ali", "final", "Arabic origin"),
  c("bala", "Bala", "Бала", "Bala", "final", "child"),
  c("tekin", "Təkin", "Тәкин", "Tekin", "final", "prince"),
];

function n(
  azLatin: string,
  azCyrillic: string,
  enLatin: string,
  segments: readonly string[] | null,
  gender?: Gender,
  meaning?: string,
): TurkicName {
  return {
    id: `trn-${enLatin.toLowerCase()}`,
    culture: "turkic",
    azLatin,
    azCyrillic,
    enLatin,
    segments: segments ? segments.map((s) => `tr-${s}`) : null,
    ...(segments ? {} : { exclusionReason: "single-morpheme" as const }),
    confidence: "reviewed",
    ...(gender ? { gender } : {}),
    ...(meaning ? { meaning } : {}),
  };
}

export const turkicNames: readonly TurkicName[] = [
  n("Ayxan", "Ајхан", "Aykhan", ["ay", "xan"], "m", "moon + khan"),
  n("Aytən", "Ајтән", "Aytan", ["ay", "ten"], "f"),
  n("Aynur", "Ајнур", "Aynur", ["ay", "nur"], "f", "moonlight"),
  n("Aygün", "Ајҝүн", "Aygun", ["ay", "gun"], "f"),
  n("Ayşən", "Ајшән", "Ayshan", ["ay", "shen"], "f"),
  n("Aysel", "Ајсел", "Aysel", ["ay", "sel"], "f", "moon stream"),
  n("Aydan", "Ајдан", "Aydan", ["ay", "dan"], "f"),
  n("Aysu", "Ајсу", "Aysu", ["ay", "su"], "f", "moon water"),
  n("Aytac", "Ајтаҹ", "Aytaj", ["ay", "tac"], "f", "moon crown"),
  n("Aybəniz", "Ајбәниз", "Aybaniz", ["ay", "beniz"], "f", "moon-faced"),
  n("Aytəkin", "Ајтәкин", "Aytekin", ["ay", "tekin"], "f"),
  n("Aycan", "Ајҹан", "Ayjan", ["ay", "can"], "f"),
  n("Elxan", "Елхан", "Elkhan", ["el", "xan"], "m", "khan of the people"),
  n("Elnur", "Елнур", "Elnur", ["el", "nur"], "m", "light of the people"),
  n("Elşən", "Елшән", "Elshan", ["el", "shen"], "m"),
  n("Elgün", "Елҝүн", "Elgun", ["el", "gun"], "m"),
  n("Elşad", "Елшад", "Elshad", ["el", "shad"], "m"),
  n("Elmir", "Елмир", "Elmir", ["el", "mir"], "m"),
  n("Elcan", "Елҹан", "Eljan", ["el", "can"], "m"),
  n("İlxan", "Илхан", "Ilkhan", ["il", "xan"], "m", "khan of the realm"),
  n("Gülnar", "Ҝүлнар", "Gulnar", ["gul", "nar"], "f", "rose + pomegranate"),
  n("Gülşən", "Ҝүлшән", "Gulshan", ["gul", "shen"], "f"),
  n("Gülnur", "Ҝүлнур", "Gulnur", ["gul", "nur"], "f"),
  n("Gülay", "Ҝүлај", "Gulay", ["gul", "ay"], "f"),
  n("Gülcan", "Ҝүлҹан", "Guljan", ["gul", "can"], "f"),
  n("Günay", "Ҝүнај", "Gunay", ["gun", "ay"], "f", "sun + moon"),
  n("Günel", "Ҝүнел", "Gunel", ["gun", "el"], "f"),
  n("Nuray", "Нурај", "Nuray", ["nur", "ay"], "f"),
  n("Nurcan", "Нурҹан", "Nurjan", ["nur", "can"], "u"),
  n("Alpay", "Алпај", "Alpay", ["alp", "ay"], "m"),
  n("Alpaslan", "Алпаслан", "Alpaslan", ["alp", "aslan"], "m", "hero lion"),
  n("Canpolad", "Ҹанполад", "Janpolad", ["can", "polad"], "m", "soul of steel"),
  n("Cansu", "Ҹансу", "Jansu", ["can", "su"], "f"),
  n("Mirəli", "Мирәли", "Mirali", ["mir", "ali"], "m"),
  n("Tanrıverdi", "Танрыверди", "Tanriverdi", ["tanri", "verdi"], "m", "God-given"),
  n("Xudaverdi", "Худаверди", "Khudaverdi", ["xuda", "verdi"], "m", "God-given"),
  n("Ağabala", "Ағабала", "Aghabala", ["aga", "bala"], "m"),
  n("Dəniz", "Дәниз", "Deniz", null, "u", "sea"),
  n("Tural", "Турал", "Tural", null, "m"),
  n("Altay", "Алтај", "Altay", null, "m"),
  n("Ulduz", "Улдуз", "Ulduz", null, "f", "star"),
  n("Araz", "Араз", "Araz", null, "m"),
  n("Toğrul", "Тоғрул", "Toghrul", null, "m"),
];

export const turkicCulture: CultureDefinition = {
  id: "turkic",
  joinRule: "turkic-concat",
  previewComponentIds: ["tr-ay", "tr-gul", "tr-xan", "tr-nur", "tr-bey"],
  components: turkicComponents,
  names: turkicNames,
};

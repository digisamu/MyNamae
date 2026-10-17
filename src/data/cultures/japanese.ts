import type {
  ComponentPosition,
  CultureDefinition,
  JapaneseComponent,
  JapaneseName,
} from "@/types/names";

/*
 * Japanese dictionary.
 *
 * Components carry only a reading (hiragana + Hepburn). They deliberately have no kanji: the same reading
 * maps to many characters, and kanji may only come from a curated name entry, never from the components.
 *
 * Curated names are split at kanji boundaries whose readings are compositional (陽|翔 → はる|と).
 * Rendaku forms (島 しま → じま) are stored as their own components. Names with jukujikun readings
 * (大和 やまと) or single-kanji names are kept but excluded from dice-based established mode.
 */

function c(
  id: string,
  hiragana: string,
  hepburn: string,
  position: ComponentPosition,
  bound = false,
): JapaneseComponent {
  return {
    id: `ja-${id}`,
    culture: "japanese",
    hiragana,
    hepburn,
    position,
    confidence: "reviewed",
    // Single-vowel endings only read naturally inside a Japanese name.
    ...(bound ? { bound: true } : {}),
  };
}

export const japaneseComponents: readonly JapaneseComponent[] = [
  c("haru", "はる", "Haru", "any"),
  c("hi", "ひ", "Hi", "initial"),
  c("yu", "ゆ", "Yu", "any"),
  c("yui", "ゆい", "Yui", "initial"),
  c("aka", "あか", "Aka", "initial"),
  c("hiro", "ひろ", "Hiro", "any"),
  c("kou", "こう", "Kō", "initial"),
  c("ken", "けん", "Ken", "initial"),
  c("shou", "しょう", "Shō", "initial"),
  c("yuu", "ゆう", "Yū", "initial"),
  c("mi", "み", "Mi", "any"),
  c("ri", "り", "Ri", "any"),
  c("hana", "はな", "Hana", "initial"),
  c("ma", "ま", "Ma", "any"),
  c("you", "よう", "Yō", "initial"),
  c("taku", "たく", "Taku", "initial"),
  c("take", "たけ", "Take", "initial"),
  c("ta", "た", "Ta", "any"),
  c("naka", "なか", "Naka", "any"),
  c("taki", "たき", "Taki", "initial"),
  c("yama", "やま", "Yama", "initial"),
  c("taka", "たか", "Taka", "initial"),
  c("aki", "あき", "Aki", "initial"),
  c("natsu", "なつ", "Natsu", "initial"),
  c("chi", "ち", "Chi", "initial"),
  c("kazu", "かず", "Kazu", "initial"),
  c("masa", "まさ", "Masa", "initial"),
  c("tomo", "とも", "Tomo", "initial"),
  c("ai", "あい", "Ai", "initial"),
  c("kei", "けい", "Kei", "initial"),
  c("dai", "だい", "Dai", "initial"),
  c("sakura", "さくら", "Sakura", "initial"),
  c("sora", "そら", "Sora", "any"),
  c("ren", "れん", "Ren", "any"),
  c("aoi", "あおい", "Aoi", "any"),
  c("yuki", "ゆき", "Yuki", "any"),
  c("to", "と", "To", "final"),
  c("ki", "き", "Ki", "final"),
  c("na", "な", "Na", "final"),
  c("nata", "なた", "Nata", "final"),
  c("ka", "か", "Ka", "final"),
  c("ji", "じ", "Ji", "final"),
  c("ichi", "いち", "Ichi", "final"),
  c("saki", "さき", "Saki", "final"),
  c("ko", "こ", "Ko", "final"),
  c("shi", "し", "Shi", "final"),
  c("ya", "や", "Ya", "final"),
  c("suke", "すけ", "Suke", "final"),
  c("hiko", "ひこ", "Hiko", "final"),
  c("mura", "むら", "Mura", "final"),
  c("jima", "じま", "Jima", "final"),
  c("moto", "もと", "Moto", "final"),
  c("hashi", "はし", "Hashi", "final"),
  c("uchi", "うち", "Uchi", "final"),
  c("zawa", "ざわ", "Zawa", "final"),
  c("da", "だ", "Da", "final"),
  c("i", "い", "I", "final", true),
  c("o", "お", "O", "final", true),
];

function n(
  kanji: string | undefined,
  hiragana: string,
  hepburn: string,
  segments: readonly string[] | null,
  kind: JapaneseName["kind"] = "given",
  meaning?: string,
  exclusionReason?: JapaneseName["exclusionReason"],
): JapaneseName {
  return {
    id: `jan-${hepburn
      .normalize("NFD")
      .toLowerCase()
      .replace(/[^a-z]/g, "")}`,
    culture: "japanese",
    ...(kanji ? { kanji } : {}),
    hiragana,
    hepburn,
    kind,
    segments: segments ? segments.map((s) => `ja-${s}`) : null,
    ...(segments ? {} : { exclusionReason: exclusionReason ?? "single-morpheme" }),
    confidence: "reviewed",
    ...(meaning ? { meaning } : {}),
  };
}

export const japaneseNames: readonly JapaneseName[] = [
  n("陽翔", "はると", "Haruto", ["haru", "to"], "given", "sun + soar"),
  n("春樹", "はるき", "Haruki", ["haru", "ki"], "given", "spring + tree"),
  n("春香", "はるか", "Haruka", ["haru", "ka"], "given", "spring + fragrance"),
  n("春菜", "はるな", "Haruna", ["haru", "na"], "given", "spring + greens"),
  n("陽菜", "ひな", "Hina", ["hi", "na"], "given", "sun + greens"),
  n("日向", "ひなた", "Hinata", ["hi", "nata"], "given", "sunny place"),
  n("結衣", "ゆい", "Yui", ["yu", "i"], "given", "tie + garment"),
  n("結菜", "ゆいな", "Yuina", ["yui", "na"], "given"),
  n("由紀", "ゆき", "Yuki", ["yu", "ki"], "given"),
  n("明里", "あかり", "Akari", ["aka", "ri"], "given", "bright + village"),
  n("大翔", "ひろと", "Hiroto", ["hiro", "to"], "given", "great + soar"),
  n("博之", "ひろゆき", "Hiroyuki", ["hiro", "yuki"], "given"),
  n("浩二", "こうじ", "Kōji", ["kou", "ji"], "given"),
  n("健一", "けんいち", "Ken'ichi", ["ken", "ichi"], "given", "healthy + one"),
  n("健太", "けんた", "Kenta", ["ken", "ta"], "given"),
  n("翔太", "しょうた", "Shōta", ["shou", "ta"], "given"),
  n("優斗", "ゆうと", "Yūto", ["yuu", "to"], "given"),
  n("悠真", "ゆうま", "Yūma", ["yuu", "ma"], "given"),
  n("美咲", "みさき", "Misaki", ["mi", "saki"], "given", "beauty + bloom"),
  n("美優", "みゆ", "Miyu", ["mi", "yu"], "given"),
  n("莉子", "りこ", "Riko", ["ri", "ko"], "given"),
  n("花子", "はなこ", "Hanako", ["hana", "ko"], "given", "flower + child"),
  n("真央", "まお", "Mao", ["ma", "o"], "given"),
  n("陽太", "ようた", "Yōta", ["you", "ta"], "given"),
  n("拓海", "たくみ", "Takumi", ["taku", "mi"], "given", "open up + sea"),
  n("武志", "たけし", "Takeshi", ["take", "shi"], "given"),
  n("千春", "ちはる", "Chiharu", ["chi", "haru"], "given", "thousand + spring"),
  n("千尋", "ちひろ", "Chihiro", ["chi", "hiro"], "given"),
  n("和也", "かずや", "Kazuya", ["kazu", "ya"], "given"),
  n("正樹", "まさき", "Masaki", ["masa", "ki"], "given"),
  n("智子", "ともこ", "Tomoko", ["tomo", "ko"], "given"),
  n("愛子", "あいこ", "Aiko", ["ai", "ko"], "given", "love + child"),
  n("桜子", "さくらこ", "Sakurako", ["sakura", "ko"], "given", "cherry blossom + child"),
  n("明子", "あきこ", "Akiko", ["aki", "ko"], "given"),
  n("夏樹", "なつき", "Natsuki", ["natsu", "ki"], "given", "summer + tree"),
  n("雪菜", "ゆきな", "Yukina", ["yuki", "na"], "given", "snow + greens"),
  n("圭介", "けいすけ", "Keisuke", ["kei", "suke"], "given"),
  n("大輔", "だいすけ", "Daisuke", ["dai", "suke"], "given"),
  n("明彦", "あきひこ", "Akihiko", ["aki", "hiko"], "given"),
  n("田中", "たなか", "Tanaka", ["ta", "naka"], "surname", "rice field + middle"),
  n("中村", "なかむら", "Nakamura", ["naka", "mura"], "surname", "middle + village"),
  n("中島", "なかじま", "Nakajima", ["naka", "jima"], "surname", "middle + island"),
  n("滝本", "たきもと", "Takimoto", ["taki", "moto"], "surname", "waterfall + origin"),
  n("滝沢", "たきざわ", "Takizawa", ["taki", "zawa"], "surname", "waterfall + marsh"),
  n("山本", "やまもと", "Yamamoto", ["yama", "moto"], "surname", "mountain + origin"),
  n("高橋", "たかはし", "Takahashi", ["taka", "hashi"], "surname", "tall + bridge"),
  n("竹内", "たけうち", "Takeuchi", ["take", "uchi"], "surname", "bamboo + inside"),
  n("竹田", "たけだ", "Takeda", ["take", "da"], "surname", "bamboo + rice field"),
  n("蓮", "れん", "Ren", null, "given", "lotus"),
  n("空", "そら", "Sora", null, "given", "sky"),
  n("葵", "あおい", "Aoi", null, "given", "hollyhock"),
  n("桜", "さくら", "Sakura", null, "given", "cherry blossom"),
  n("大和", "やまと", "Yamato", null, "given", undefined, "non-compositional-reading"),
];

export const japaneseCulture: CultureDefinition = {
  id: "japanese",
  joinRule: "japanese-kana",
  previewComponentIds: ["ja-haru", "ja-sora", "ja-yuki", "ja-ren", "ja-to"],
  components: japaneseComponents,
  names: japaneseNames,
};

import type {
  ArabicComponent,
  ArabicName,
  ComponentPosition,
  CultureDefinition,
  Gender,
} from "@/types/names";

/*
 * Arabic dictionary.
 *
 * Arabic names are structural, so pure-Arabic combinations must match a pair rule:
 *  - "Abd al-" + a divine attribute         → Abd al-Rahman  / عبد الرحمن
 *  - Abd / Nur / Sayf … + Allah             → Abdullah       / عبد الله
 *  - a laqab element + Din                  → Nur al-Din     / نور الدين
 *  - given name + masculine given name      → Layla Omar     (given name followed by father's name)
 *
 * Bound components (Abd, Abd al-, Allah, Din, attributes reserved for God) never appear next to
 * another culture's component, so a mixed name can never read as "servant of <arbitrary word>".
 */

interface Opts {
  tags?: readonly string[];
  bound?: boolean;
  gender?: Gender;
  note?: string;
}

function c(
  id: string,
  latin: string,
  translit: string,
  arabic: string,
  position: ComponentPosition,
  opts: Opts = {},
): ArabicComponent {
  return {
    id: `ar-${id}`,
    culture: "arabic",
    latin,
    translit,
    arabic,
    position,
    confidence: "reviewed",
    ...opts,
  };
}

const laqab = { tags: ["laqab"], bound: true } as const;
const attribute = { tags: ["divine-attribute"], bound: true } as const;
const givenM = (...extra: string[]): Opts => ({ tags: ["given", "given-m", ...extra], gender: "m" });
const givenF: Opts = { tags: ["given"], gender: "f" };

export const arabicComponents: readonly ArabicComponent[] = [
  // Bound initial elements
  c("abd", "Abd", "ʿAbd", "عبد", "initial", { tags: ["allah-compound"], bound: true, note: "servant" }),
  c("abd-al", "Abd al-", "ʿAbd al-", "عبد ال", "initial", { tags: ["abd-al"], bound: true, note: "servant of the" }),
  c("salah", "Salah", "Ṣalāḥ", "صلاح", "initial", { ...laqab, note: "righteousness" }),
  c("shams", "Shams", "Shams", "شمس", "initial", { ...laqab, note: "sun" }),
  c("izz", "Izz", "ʿIzz", "عز", "initial", { ...laqab, note: "glory" }),
  c("ala", "Ala", "ʿAlāʾ", "علاء", "initial", { ...laqab, note: "nobility" }),
  c("taj", "Taj", "Tāj", "تاج", "initial", { ...laqab, note: "crown" }),
  c("diya", "Diya", "Ḍiyāʾ", "ضياء", "initial", { ...laqab, note: "radiance" }),
  c("fakhr", "Fakhr", "Fakhr", "فخر", "initial", { ...laqab, note: "pride" }),
  c("sharaf", "Sharaf", "Sharaf", "شرف", "initial", { ...laqab, note: "honour" }),
  c("sayf", "Sayf", "Sayf", "سيف", "initial", { tags: ["laqab", "allah-compound"], bound: true, note: "sword" }),
  c("fadl", "Fadl", "Faḍl", "فضل", "initial", { tags: ["allah-compound"], bound: true, note: "grace" }),
  c("ata", "Ata", "ʿAṭāʾ", "عطاء", "initial", { tags: ["allah-compound"], bound: true, note: "gift" }),

  // Bound final elements
  c("allah", "Allah", "Allāh", "الله", "final", { tags: ["allah"], bound: true }),
  c("din", "Din", "Dīn", "دين", "final", { tags: ["din"], bound: true, note: "faith" }),
  c("rahman", "Rahman", "Raḥmān", "رحمن", "final", { ...attribute, note: "the Most Gracious" }),
  c("rahim", "Rahim", "Raḥīm", "رحيم", "final", { ...attribute, note: "the Most Merciful" }),
  c("malik-king", "Malik", "Malik", "ملك", "final", { ...attribute, note: "the King" }),
  c("wahhab", "Wahhab", "Wahhāb", "وهاب", "final", { ...attribute, note: "the Bestower" }),
  c("razzaq", "Razzaq", "Razzāq", "رزاق", "final", { ...attribute, note: "the Provider" }),
  c("ghafur", "Ghafur", "Ghafūr", "غفور", "final", { ...attribute, note: "the Forgiving" }),
  c("qadir", "Qadir", "Qādir", "قادر", "final", { ...attribute, note: "the Capable" }),
  c("salam", "Salam", "Salām", "سلام", "final", { ...attribute, note: "Peace" }),

  // Given names, some of which also act as laqab elements or divine attributes
  c("nur", "Nur", "Nūr", "نور", "any", { tags: ["given", "laqab", "allah-compound"], gender: "u", note: "light" }),
  c("zayn", "Zayn", "Zayn", "زين", "any", { ...givenM("laqab"), note: "beauty, grace" }),
  c("badr", "Badr", "Badr", "بدر", "any", { ...givenM("laqab"), note: "full moon" }),
  c("jamal", "Jamal", "Jamāl", "جمال", "any", { ...givenM("laqab"), note: "beauty" }),
  c("kamal", "Kamal", "Kamāl", "كمال", "any", { ...givenM("laqab"), note: "perfection" }),
  c("nasir", "Nasir", "Nāṣir", "ناصر", "any", { ...givenM("laqab"), note: "helper" }),
  c("habib", "Habib", "Ḥabīb", "حبيب", "any", { ...givenM("allah-compound"), note: "beloved" }),
  c("karim", "Karim", "Karīm", "كريم", "any", { ...givenM("divine-attribute"), note: "generous" }),
  c("aziz", "Aziz", "ʿAzīz", "عزيز", "any", { ...givenM("divine-attribute"), note: "mighty, dear" }),
  c("hakim", "Hakim", "Ḥakīm", "حكيم", "any", { ...givenM("divine-attribute"), note: "wise" }),
  c("latif", "Latif", "Laṭīf", "لطيف", "any", { ...givenM("divine-attribute"), note: "gentle" }),
  c("hadi", "Hadi", "Hādī", "هادي", "any", { ...givenM("divine-attribute"), note: "guide" }),
  c("majid", "Majid", "Majīd", "مجيد", "any", { ...givenM("divine-attribute"), note: "glorious" }),
  c("hamid", "Hamid", "Ḥamīd", "حميد", "any", { ...givenM("divine-attribute"), note: "praiseworthy" }),
  c("jalil", "Jalil", "Jalīl", "جليل", "any", { ...givenM("divine-attribute"), note: "majestic" }),
  c("malik", "Malik", "Mālik", "مالك", "any", { ...givenM(), note: "owner" }),
  c("omar", "Omar", "ʿUmar", "عمر", "any", givenM()),
  c("ali", "Ali", "ʿAlī", "علي", "any", { ...givenM(), note: "exalted" }),
  c("amir", "Amir", "Amīr", "أمير", "any", { ...givenM(), note: "prince" }),
  c("samir", "Samir", "Samīr", "سمير", "any", { ...givenM(), note: "companion in conversation" }),
  c("hasan", "Hasan", "Ḥasan", "حسن", "any", { ...givenM(), note: "good" }),
  c("husayn", "Husayn", "Ḥusayn", "حسين", "any", givenM()),
  c("khalid", "Khalid", "Khālid", "خالد", "any", { ...givenM(), note: "eternal" }),
  c("yusuf", "Yusuf", "Yūsuf", "يوسف", "any", givenM()),
  c("tariq", "Tariq", "Ṭāriq", "طارق", "any", { ...givenM(), note: "morning star" }),
  c("faris", "Faris", "Fāris", "فارس", "any", { ...givenM(), note: "knight" }),
  c("rashid", "Rashid", "Rāshid", "راشد", "any", { ...givenM(), note: "rightly guided" }),
  c("idris", "Idris", "Idrīs", "إدريس", "any", givenM()),
  c("hamza", "Hamza", "Ḥamza", "حمزة", "any", givenM()),
  c("bilal", "Bilal", "Bilāl", "بلال", "any", givenM()),
  c("nabil", "Nabil", "Nabīl", "نبيل", "any", { ...givenM(), note: "noble" }),
  c("rayyan", "Rayyan", "Rayyān", "ريان", "any", givenM()),
  c("yasmin", "Yasmin", "Yāsmīn", "ياسمين", "any", { ...givenF, note: "jasmine" }),
  c("layla", "Layla", "Laylā", "ليلى", "any", { ...givenF, note: "night" }),
  c("fatima", "Fatima", "Fāṭima", "فاطمة", "any", givenF),
  c("maryam", "Maryam", "Maryam", "مريم", "any", givenF),
  c("salma", "Salma", "Salmā", "سلمى", "any", { ...givenF, note: "peaceful" }),
  c("amira", "Amira", "Amīra", "أميرة", "any", { ...givenF, note: "princess" }),
  c("nadia", "Nadia", "Nādiya", "نادية", "any", givenF),
  c("zaynab", "Zaynab", "Zaynab", "زينب", "any", givenF),
  c("huda", "Huda", "Hudā", "هدى", "any", { ...givenF, note: "guidance" }),
  c("amal", "Amal", "Amal", "أمل", "any", { ...givenF, note: "hope" }),
  c("rania", "Rania", "Rāniya", "رانيا", "any", givenF),
  c("samira", "Samira", "Samīra", "سميرة", "any", givenF),
];

function n(
  latin: string,
  translit: string,
  arabic: string,
  segments: readonly string[] | null,
  extra: Partial<Pick<ArabicName, "gender" | "meaning" | "conventionalLatin">> = {},
): ArabicName {
  return {
    id: `arn-${latin.toLowerCase().replace(/[^a-z]+/g, "-")}`,
    culture: "arabic",
    latin,
    translit,
    arabic,
    segments: segments ? segments.map((s) => `ar-${s}`) : null,
    ...(segments ? {} : { exclusionReason: "single-morpheme" as const }),
    confidence: "reviewed",
    gender: "m",
    ...extra,
  };
}

export const arabicNames: readonly ArabicName[] = [
  n("Abdullah", "ʿAbd Allāh", "عبد الله", ["abd", "allah"], { meaning: "servant of God" }),
  n("Nurullah", "Nūr Allāh", "نور الله", ["nur", "allah"], { meaning: "light of God" }),
  n("Sayfullah", "Sayf Allāh", "سيف الله", ["sayf", "allah"], { meaning: "sword of God" }),
  n("Habibullah", "Ḥabīb Allāh", "حبيب الله", ["habib", "allah"], { meaning: "beloved of God" }),
  n("Fadlallah", "Faḍl Allāh", "فضل الله", ["fadl", "allah"], { meaning: "grace of God", conventionalLatin: true }),
  n("Ataullah", "ʿAṭāʾ Allāh", "عطاء الله", ["ata", "allah"], { meaning: "gift of God" }),
  n("Abd al-Rahman", "ʿAbd al-Raḥmān", "عبد الرحمن", ["abd-al", "rahman"], { meaning: "servant of the Most Gracious" }),
  n("Abd al-Rahim", "ʿAbd al-Raḥīm", "عبد الرحيم", ["abd-al", "rahim"], { meaning: "servant of the Most Merciful" }),
  n("Abd al-Karim", "ʿAbd al-Karīm", "عبد الكريم", ["abd-al", "karim"], { meaning: "servant of the Generous" }),
  n("Abd al-Malik", "ʿAbd al-Malik", "عبد الملك", ["abd-al", "malik-king"], { meaning: "servant of the King" }),
  n("Abd al-Aziz", "ʿAbd al-ʿAzīz", "عبد العزيز", ["abd-al", "aziz"], { meaning: "servant of the Mighty" }),
  n("Abd al-Hakim", "ʿAbd al-Ḥakīm", "عبد الحكيم", ["abd-al", "hakim"], { meaning: "servant of the Wise" }),
  n("Abd al-Latif", "ʿAbd al-Laṭīf", "عبد اللطيف", ["abd-al", "latif"], { meaning: "servant of the Gentle" }),
  n("Abd al-Hadi", "ʿAbd al-Hādī", "عبد الهادي", ["abd-al", "hadi"], { meaning: "servant of the Guide" }),
  n("Abd al-Majid", "ʿAbd al-Majīd", "عبد المجيد", ["abd-al", "majid"], { meaning: "servant of the Glorious" }),
  n("Abd al-Hamid", "ʿAbd al-Ḥamīd", "عبد الحميد", ["abd-al", "hamid"], { meaning: "servant of the Praiseworthy" }),
  n("Abd al-Jalil", "ʿAbd al-Jalīl", "عبد الجليل", ["abd-al", "jalil"], { meaning: "servant of the Majestic" }),
  n("Abd al-Wahhab", "ʿAbd al-Wahhāb", "عبد الوهاب", ["abd-al", "wahhab"], { meaning: "servant of the Bestower" }),
  n("Abd al-Razzaq", "ʿAbd al-Razzāq", "عبد الرزاق", ["abd-al", "razzaq"], { meaning: "servant of the Provider" }),
  n("Abd al-Ghafur", "ʿAbd al-Ghafūr", "عبد الغفور", ["abd-al", "ghafur"], { meaning: "servant of the Forgiving" }),
  n("Abd al-Qadir", "ʿAbd al-Qādir", "عبد القادر", ["abd-al", "qadir"], { meaning: "servant of the Capable" }),
  n("Abd al-Salam", "ʿAbd al-Salām", "عبد السلام", ["abd-al", "salam"], { meaning: "servant of Peace" }),
  n("Nur al-Din", "Nūr al-Dīn", "نور الدين", ["nur", "din"], { meaning: "light of the faith" }),
  n("Salah al-Din", "Ṣalāḥ al-Dīn", "صلاح الدين", ["salah", "din"], { meaning: "righteousness of the faith" }),
  n("Shams al-Din", "Shams al-Dīn", "شمس الدين", ["shams", "din"], { meaning: "sun of the faith" }),
  n("Badr al-Din", "Badr al-Dīn", "بدر الدين", ["badr", "din"], { meaning: "full moon of the faith" }),
  n("Zayn al-Din", "Zayn al-Dīn", "زين الدين", ["zayn", "din"], { meaning: "grace of the faith" }),
  n("Ala al-Din", "ʿAlāʾ al-Dīn", "علاء الدين", ["ala", "din"], { meaning: "nobility of the faith" }),
  n("Izz al-Din", "ʿIzz al-Dīn", "عز الدين", ["izz", "din"], { meaning: "glory of the faith" }),
  n("Taj al-Din", "Tāj al-Dīn", "تاج الدين", ["taj", "din"], { meaning: "crown of the faith" }),
  n("Jamal al-Din", "Jamāl al-Dīn", "جمال الدين", ["jamal", "din"], { meaning: "beauty of the faith" }),
  n("Kamal al-Din", "Kamāl al-Dīn", "كمال الدين", ["kamal", "din"], { meaning: "perfection of the faith" }),
  n("Nasir al-Din", "Nāṣir al-Dīn", "ناصر الدين", ["nasir", "din"], { meaning: "helper of the faith" }),
  n("Fakhr al-Din", "Fakhr al-Dīn", "فخر الدين", ["fakhr", "din"], { meaning: "pride of the faith" }),
  n("Diya al-Din", "Ḍiyāʾ al-Dīn", "ضياء الدين", ["diya", "din"], { meaning: "radiance of the faith" }),
  n("Sharaf al-Din", "Sharaf al-Dīn", "شرف الدين", ["sharaf", "din"], { meaning: "honour of the faith" }),
  n("Sayf al-Din", "Sayf al-Dīn", "سيف الدين", ["sayf", "din"], { meaning: "sword of the faith" }),
  n("Omar", "ʿUmar", "عمر", null),
  n("Ali", "ʿAlī", "علي", null),
  n("Amir", "Amīr", "أمير", null),
  n("Karim", "Karīm", "كريم", null),
  n("Samir", "Samīr", "سمير", null),
  n("Malik", "Mālik", "مالك", null),
  n("Khalid", "Khālid", "خالد", null),
  n("Yusuf", "Yūsuf", "يوسف", null),
  n("Zayn", "Zayn", "زين", null),
  n("Nur", "Nūr", "نور", null, { gender: "u" }),
  n("Yasmin", "Yāsmīn", "ياسمين", null, { gender: "f" }),
  n("Layla", "Laylā", "ليلى", null, { gender: "f" }),
  n("Fatima", "Fāṭima", "فاطمة", null, { gender: "f" }),
  n("Maryam", "Maryam", "مريم", null, { gender: "f" }),
];

export const arabicCulture: CultureDefinition = {
  id: "arabic",
  joinRule: "arabic-structural",
  pairRules: [
    { left: "abd-al", right: "divine-attribute", join: "concat" },
    { left: "allah-compound", right: "allah", join: "ullah" },
    { left: "laqab", right: "din", join: "al-din" },
    { left: "given", right: "given-m", join: "nasab" },
  ],
  previewComponentIds: ["ar-nur", "ar-zayn", "ar-abd", "ar-din", "ar-layla"],
  components: arabicComponents,
  names: arabicNames,
};

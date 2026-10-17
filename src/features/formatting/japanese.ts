/** Removes Hepburn macrons: "Yūki" → "Yuki". */
export function stripMacrons(text: string): string {
  return text.normalize("NFD").replace(/̄/g, "").normalize("NFC");
}

const MONO: Readonly<Record<string, string>> = {
  あ: "a", い: "i", う: "u", え: "e", お: "o",
  か: "ka", き: "ki", く: "ku", け: "ke", こ: "ko",
  が: "ga", ぎ: "gi", ぐ: "gu", げ: "ge", ご: "go",
  さ: "sa", し: "shi", す: "su", せ: "se", そ: "so",
  ざ: "za", じ: "ji", ず: "zu", ぜ: "ze", ぞ: "zo",
  た: "ta", ち: "chi", つ: "tsu", て: "te", と: "to",
  だ: "da", ぢ: "ji", づ: "zu", で: "de", ど: "do",
  な: "na", に: "ni", ぬ: "nu", ね: "ne", の: "no",
  は: "ha", ひ: "hi", ふ: "fu", へ: "he", ほ: "ho",
  ば: "ba", び: "bi", ぶ: "bu", べ: "be", ぼ: "bo",
  ぱ: "pa", ぴ: "pi", ぷ: "pu", ぺ: "pe", ぽ: "po",
  ま: "ma", み: "mi", む: "mu", め: "me", も: "mo",
  や: "ya", ゆ: "yu", よ: "yo",
  ら: "ra", り: "ri", る: "ru", れ: "re", ろ: "ro",
  わ: "wa", を: "o", ん: "n",
};

const DIGRAPH: Readonly<Record<string, string>> = {
  きゃ: "kya", きゅ: "kyu", きょ: "kyo", ぎゃ: "gya", ぎゅ: "gyu", ぎょ: "gyo",
  しゃ: "sha", しゅ: "shu", しょ: "sho", じゃ: "ja", じゅ: "ju", じょ: "jo",
  ちゃ: "cha", ちゅ: "chu", ちょ: "cho", にゃ: "nya", にゅ: "nyu", にょ: "nyo",
  ひゃ: "hya", ひゅ: "hyu", ひょ: "hyo", びゃ: "bya", びゅ: "byu", びょ: "byo",
  ぴゃ: "pya", ぴゅ: "pyu", ぴょ: "pyo", みゃ: "mya", みゅ: "myu", みょ: "myo",
  りゃ: "rya", りゅ: "ryu", りょ: "ryo",
};

/**
 * Converts a hiragana reading to lower-case modified Hepburn, treating the input as a single morpheme:
 * おう/うう → ō/ū, っ doubles the next consonant, ん before a vowel or y takes an apostrophe.
 * Returns null for unsupported characters.
 */
export function kanaToHepburn(kana: string): string | null {
  const syllables: string[] = [];
  const chars = Array.from(kana);
  let geminate = false;
  for (let i = 0; i < chars.length; i++) {
    const pair = chars[i]! + (chars[i + 1] ?? "");
    let roman = DIGRAPH[pair];
    if (roman) {
      i++;
    } else if (chars[i] === "っ") {
      geminate = true;
      continue;
    } else {
      roman = MONO[chars[i]!];
    }
    if (roman === undefined) return null;
    if (geminate) {
      roman = (roman.startsWith("ch") ? "t" : roman.charAt(0)) + roman;
      geminate = false;
    }
    syllables.push(roman);
  }

  let out = "";
  for (let i = 0; i < syllables.length; i++) {
    const syl = syllables[i]!;
    const prev = out.charAt(out.length - 1);
    if (syl === "u" && (prev === "o" || prev === "u") && out.length > 0) {
      out = out.slice(0, -1) + (prev === "o" ? "ō" : "ū");
      continue;
    }
    if (prev === "n" && syllables[i - 1] === "n" && /^[aiueoy]/.test(syl)) out += "'";
    out += syl;
  }
  return out;
}

/** Joins two Hepburn spellings at a morpheme boundary, adding n' where ん meets a vowel or y. */
export function joinHepburn(left: string, leftKana: string, right: string): string {
  const needsApostrophe = leftKana.endsWith("ん") && /^[aiueoyāīūēō]/i.test(right);
  return `${left}${needsApostrophe ? "'" : ""}${right.toLowerCase()}`;
}

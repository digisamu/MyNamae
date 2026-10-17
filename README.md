# NameForge

Roll animated 3D dice to forge names from Turkic (Azerbaijani), Arabic and Japanese naming traditions, or blend them.

## Scripts

```bash
npm run dev          # development server
npm run build        # production build
npm test             # unit tests (Vitest)
npm run test:e2e     # end-to-end tests (Playwright; run `npx playwright install chromium` once)
npm run lint
npm run typecheck
```

## How it works

- **Dice decide the name.** `generateName` picks one component per die first, then builds six faces around it. The name is always derived from those outcomes. After settling, the 3D scene reads back each die's top face from its real orientation, and the UI shows that face.
- **Data** lives in `src/data/cultures/{turkic,arabic,japanese}.ts`: component inventories with positions (`initial` / `final` / `any`) and curated names pre-segmented at reviewed boundaries (`segments: null` plus an `exclusionReason` when a name can't be split). `src/lib/validation/dictionary.ts` checks the data: every segmentation must re-join to the curated spelling, Azerbaijani Cyrillic must agree with the letter mapping, and Hepburn must match the kana.
- **Writing systems** (`src/features/formatting`): `formatGeneratedName` applies Rules A–E as a pure function.
  - Japanese: kanji only from curated entries, otherwise hiragana.
  - Turkic: Azerbaijani Latin plus Azerbaijani Cyrillic.
  - Arabic: Latin plus right-to-left Arabic script.
  - Mixed cultures: plain English Latin only, produced by the single `toEnLatin` normaliser.
- **Arabic structure** is data-driven through pair rules (`Abd al-` + divine attribute, `… + Allah`, laqab + `al-Din`, given name + father's name). Bound elements never appear in mixed names.
- **i18n**: `src/messages/{en,ru,ja}.ts`. The Russian and Japanese files are type-checked against English, so a missing key fails the build.
- **Persistence**: a versioned `localStorage` schema read through `useSyncExternalStore`. It survives corrupt or unavailable storage and avoids hydration mismatches.

## Notes on the data

- Azerbaijani Cyrillic uses the 1958–1991 Azerbaijani alphabet (y → ј, g → ҝ, c → ҹ), so Ayxan is **Ајхан**, not the Russian-style Айхан.
- "Jan" is stored as Azerbaijani **Can** (soul), with enLatin `Jan`.
- Entries without a curated English spelling are flagged `enLatin-fallback` and use the passport-style mapping until reviewed.
- The dictionaries are curated starting sets, not exhaustive references.

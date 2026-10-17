# MyNamae

**Roll the dice. Discover your name.** *Namae* (名前) means "name" in Japanese.

MyNamae rolls animated 3D dice to build names from Turkic (Azerbaijani), Arabic and Japanese naming traditions, or a blend of them.

## Scripts

```bash
npm run dev          # development server
npm run build        # production build
npm test             # unit tests (Vitest)
npm run test:e2e     # end-to-end tests (Playwright; run `npx playwright install chromium` once)
npm run lint
npm run typecheck
```

Optional environment variables:

- `NEXT_PUBLIC_SITE_URL`: absolute origin used for Open Graph URLs.
- `NEXT_PUBLIC_ANALYTICS_PROVIDER`: reserved for a future privacy-friendly analytics integration. When it is unset (the default), the Analytics consent category is hidden and nothing is loaded.

## How it works

### Dice and names

- **The dice decide the name.** `generateName` picks one component per die first, then builds six faces around it. The name is always derived from those outcomes.
- **Choreography** (`src/components/dice/choreography.ts`) is a set of pure functions of time: anticipation, then flight with three diminishing bounces, then a staggered settle where the last die wobbles. A die's pose at or after its end time is exactly its target orientation, so fast-forwarding (`t = Infinity`) and reduced motion land on the same faces. Unit tests check every face on all three paths.
- **Readback.** After settling, the scene reads each die's top face back from its real orientation and reports it to the UI.
- **Interactions:**
  - Button press, or hold to charge a stronger throw.
  - Drag-to-throw: flick direction and speed shape the throw, but never the outcome.
  - Space or Enter on the focused arena.
  - Optional shake to roll.
  - Tap anywhere during a roll to skip to the result.
- **Lock and reroll.** Locked dice keep their component, faces and orientation; only unlocked dice are rerolled. The writing system is re-evaluated for the new combination.

### Data and writing systems

- **Data** lives in `src/data/cultures/{turkic,arabic,japanese}.ts`, validated by `src/lib/validation/dictionary.ts`.
- **Writing systems** (`src/features/formatting`) implement Rules A–E as one pure function, `formatGeneratedName`.

### Privacy and storage

`src/features/consent/` holds all cookie logic.

| Name | Kind | Category | Duration |
|---|---|---|---|
| `mynamae_consent` | cookie | Necessary | 6 months, then asked again |
| `mynamae_locale` | cookie | Necessary | 12 months |
| `mynamae:state` | localStorage | Functional | Until cleared or consent is withdrawn |

- Cookies are first-party with `Path=/` and `SameSite=Lax`, and `Secure` in production.
- The server reads both cookies, so the first render already uses the right language and banner state.
- Bumping `POLICY_VERSION` asks everyone for consent again.
- Functional storage is written only after consent. Without it, favorites and history last for the visit only.
- Withdrawing consent deletes stored data, after a confirmation dialog.
- There is no analytics, advertising or third-party content.

**Migration.** Data saved under the previous product name's key is read once and merged into `mynamae:state`, without dropping any valid favorite. The old key is removed after a successful write. The previous language preference moves to the locale cookie.

### Sharing and extras

- **Share links** encode only component ids (`/?r=tr-ay.tr-xan&m=e`).
- **Download card** renders a PNG on a client-side canvas.
- **Listen** uses on-device `speechSynthesis` voices.
- **Sounds** are generated with the Web Audio API and are off by default.
- **Name of the day** is chosen deterministically from the UTC date.

## Notes on the data

- Azerbaijani Cyrillic uses the 1958–1991 Azerbaijani alphabet (y → ј, g → ҝ, c → ҹ). So Ayxan is **Ајхан**, not the Russian-style Айхан.
- "Jan" is stored as Azerbaijani **Can** (soul), with the English spelling `Jan`.
- Entries without a curated English spelling are flagged `enLatin-fallback` and use the passport-style mapping until reviewed.
- The name style filter applies only to curated names whose data records gender. Creative names are never assigned one.
- The dictionaries are curated starting sets, not exhaustive references.

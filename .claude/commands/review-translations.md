# Review Translations

1. Confirm the source of truth. Review `src/i18n/index.ts` for locale config changes and make sure `src/i18n/en.ts` remains the master copy before touching tooling.
2. Establish the baseline. Run `npm run i18n stats` for per-locale completion numbers and `npm run i18n audit` to catch missing or extra keys.
3. Investigate problem areas with the CLI instead of editing files manually:
   - `npm run i18n compare -- --locales en,ja` (or any pair) for side-by-side diffs.
   - `npm run i18n search -- --text "split bill"` to find inconsistent phrasing.
   - `npm run i18n export -- --format csv` to hand translators a spreadsheet.
4. After translators finish, run `npm run i18n sync` to pull any new English keys into every locale, then `npm run i18n find-unused` to surface dead strings before you open the PR.
5. QA in the browser: `npm run dev`, walk `/[locale]/` routes (including RTL like `/ar/`) to confirm copy, layout, hreflang tags, and locale-specific assets.
6. Keep it enforced. Add `npm run i18n audit` (and optionally `stats`) to CI so translation PRs can only merge when the audit passes.

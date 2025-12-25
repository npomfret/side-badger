# Review Translations

1. Confirm the source of truth. Review `src/i18n/index.ts` for locale config changes and make sure `src/i18n/en.ts` remains the master copy before touching tooling.
2. Establish the baseline. Run `npm run i18n stats` for per-locale completion numbers and `npm run i18n audit` to catch missing or extra keys.
3. Review every key one-by-one using the CLI so nothing gets skipped:
   - `npm run i18n list` to print the canonical key order; work straight down this list.
   - For each key, run `npm run i18n get -- --key hero.cta --locales en,ja` (swap in the locale under review) and confirm the non-English value faithfully reflects the English master—catch mistranslations, tone issues, incorrect numbers, or cultural faux pas.
   - Keep a QA mindset: flag anything that is literally wrong, awkward, inconsistent with product terminology, or legally risky; don't accept a translation just because the key exists.
   - If a key looks off, immediately open a side-by-side diff with `npm run i18n compare -- --locales en,ja --key hero.cta` so you can adjust it in context.
   - When you need an offline checklist, `npm run i18n export -- --format csv --locales en,ja` and tick through each row while verifying translations manually.
   - Use `npm run i18n search -- --text "split bill"` anytime you suspect repeated copy needs alignment across keys.
4. After translators finish, run `npm run i18n sync` to pull any new English keys into every locale, then `npm run i18n find-unused` to surface dead strings before you open the PR.
5. QA in the browser: `npm run dev`, walk `/[locale]/` routes (including RTL like `/ar/`) to confirm copy, layout, hreflang tags, and locale-specific assets.
6. Keep it enforced. Add `npm run i18n audit` (and optionally `stats`) to CI so translation PRs can only merge when the audit passes.

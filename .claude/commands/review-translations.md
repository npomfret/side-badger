# Review Translations

1. Confirm the source of truth. Review `src/i18n/index.ts` for locale config changes and make sure `src/i18n/en.ts` remains the master copy before touching tooling.
2. Establish the baseline. Run `npm run i18n stats` for per-locale completion numbers and `npm run i18n audit` to catch missing or extra keys.
3. Do a key-by-key verification using the CLI so nothing gets skipped—the quality of every translation is paramount:
   - `npm run i18n list` to print the canonical key order; treat it like a checklist and move to the next key only after signing off the current one.
   - For each key, run `npm run i18n get -- --key hero.cta --locales en,ja` (swap in the locale under review) and confirm the non-English value faithfully reflects the English master—catch mistranslations, tone issues, incorrect numbers, or cultural faux pas before proceeding.
   - Keep a QA mindset on every key: flag anything literally wrong, awkward, inconsistent with product terminology, or legally risky; quality and accuracy outweigh speed, so don't accept a translation just because the key exists.
   - If a key looks off, immediately open a side-by-side diff with `npm run i18n compare -- --locales en,ja --key hero.cta` so you can adjust it in context.
   - When you need an offline checklist, `npm run i18n export -- --format csv --locales en,ja` and tick through each row while verifying translations manually.
   - Use `npm run i18n search -- --text "split bill"` anytime you suspect repeated copy needs alignment across keys.
4. Check for missing, stale and untranslated entries with `npm run i18n audit` (exit 1 on any) and `npm run i18n stale`. Do NOT run `npm run i18n sync` to fix gaps: it only reports, and English text must never be copied into a locale file as a placeholder. Translate missing keys by hand, then record the English hash with `npm run i18n lock <locale> --keys a,b` (see `src/i18n/locks/<locale>.json`). A value that is legitimately identical to English (a brand name) goes in that lock's `identicalApproved`. Run `npm run i18n find-unused` to surface dead strings before you open the PR.
   - `I18N_MODE=english-first` (the `redesign` branch) lets keys listed in `src/i18n/pending/keys.json` be missing or extra; the default `strict` mode needs both pending manifests empty.
5. QA in the browser: `npm run dev`, walk `/[locale]/` routes (including RTL like `/ar/`) to confirm copy, layout, hreflang tags, and locale-specific assets.
6. Keep it enforced. Add `npm run i18n audit` (in strict mode) to CI so translation PRs can only merge when the audit passes.

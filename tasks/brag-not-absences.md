# Brag about what we do better, not what we leave out

Owner decision, 22 November 2026: ads and a paid tier may come, so the site stops promising "no ads" and "no paid tier". It brags about what Side Badger does better, for free, instead. This replaces site plan D2's "Free. No ads. No daily limits." line and D3's "No ads" trust claim (`tasks/seo-site-expansion-plan.md`).

## Decisions

- **Gone everywhere:** "no ads", "ad-free" and "no paid tier", including the registry claim `privacy-posture.no-ads` and the pricing FAQ's "nothing held back for a premium plan".
- **Kept:**
  - **"No daily limits"**: the owner did not rule it out, and it is a real advantage over Splitwise's free plan (4 expenses a day).
  - **The privacy claims**: no ad or analytics trackers, essential cookies only, no selling of personal data.
  - **"Free today, with notice before any change"**: the terms' own words.
- **The repeated line:**
  - The footer tagline becomes "Free, even the clever bits."
  - The homepage pricing scene and the pricing page subtitle say "Free receipt scanning and currency conversion, with no daily limits."
- **Homepage trust scene:** the "No ads" stamp becomes "Only your group sees it". That fact moves out of the selling stamp's detail line.
- **Homepage receipt prop:** the "Ads 0" line becomes "Awkward maths 0".
- **Splitwise comparison:** this change only removes the ads and paid-tier wording. The rewrite stays in `tasks/reframe-app-comparison.md`, which now follows this rule.

## Plan

1. Write the English: `en.ts`, the English YAML, the registry, the substitutions, the scene and page components, the e2e page objects and the docs.
2. Translate into the other 38 locales with Sonnet, at most 10 locales per agent. Most changes are deletions that mirror the English. Then run blind back-checks on the new wording.
3. Run `npm run verify` and the e2e home and pricing specs. Then a ui-change-reviewer review, a commit and a push.

## Done when

No English page or interface string promises no ads or no paid tier, and the substitutions test bans those phrases. Every locale matches. The gates pass and the change is live.

## Result

Implemented on 22 November 2026.
- **Copy:** 19 interface strings and 10 content entries changed. The three new keys are `home.trust.membersTitle`, `home.trust.membersBody` and `home.cta.receiptMaths`. The removed keys are `home.trust.adsTitle`, `home.trust.adsBody` and `home.cta.receiptAds`.
- **Translations:** Sonnet translated all 38 locales and blind back-checks followed. Fixed after the back-checks: ko and zh `membersBody`, ur and id `receiptMaths`, zh "ad trackers" (it could read as "no ads"), and two Swedish guides the translator had missed. No person has reviewed these translations.
- **Tests:**
  - Strict `npm run verify` passed: 1243 unit tests; `check:site` passed once rule 13's fixture read the tagline from `en.ts`.
  - e2e home, pricing, localized and site: 2210 passed. The pricing spec, rerun with "no ads" and "no paid tier" added to its banned phrases, passed 52.
  - Screenshots of the trust and pricing scenes in xx-long, ar and de show no overflow.

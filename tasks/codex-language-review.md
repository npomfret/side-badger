# Codex language review

Requested by the owner on 20 November 2026. Status: done for 22 locales. The owner deferred the rest to the detailed human review planned before a marketing drive ("we will review the translations in more detail before we do a marketing drive").

## Why

Every localized page is `checked`: an agent translated it and another back-translated it. Back-checks catch changed meaning, but not stiff phrasing, register drift, inconsistent terms or flat jokes. No fluent human reviewers exist yet, so this is the `review-translations` pre-review pass that follow-ups allows.

## Limits

- This is an agent review. Nothing is marked `reviewed`, and every locale stays `noindex` (D8, D31).

## What was done

- **Review.** Codex read every UI key and every content entry of 22 locales against the English: ar, bn, cy, da, de, es, eu, fa, fr, ga, hi, it, ja, ko, nl-BE, no, pcm, pt, ro, te, ur and zh. That was two locales per agent, under the brief in the worktree's `tmp/lang-review/BRIEF.md`.
  - Changes were limited to defects: meaning, grammar, unnatural phrasing, inconsistent terms or register, app labels that differed from `packages/locales` in the app, number formats, and jokes that didn't land.
  - Scores ran from 3/5 to 4/5 before the fixes.
- **Changed strings.** 1,245 strings changed: 398 content entries plus UI keys.
- **Western digits.** The ar and fa reviewers converted prose digits to Arabic-Indic. That was reverted, because the site convention is Western digits in every locale (`src/components/content/money.ts`).
- **Blind back-check.**
  - Five separate Codex agents back-translated every changed string from a packet containing no English, then compared it with the English. The packets were built from the diff by `tmp/ad-hoc-scripts/backcheck-packets.mjs`.
  - 48 strings failed and were fixed by the checkers.
  - All 398 changed content entries were recorded as `checked` by `CX-review` on 20 November 2026.
- **English bug found by the review.**
  - Two English fields still used the old currency count. group-trips `lead` said "138 other currencies" and multiple-currencies `sections[2].body` said "139 other options", against 133 in total.
  - Both now say 131 and 132 in all 39 locales. The script changed only the number, which occurred exactly once per file.
  - Both entries were re-locked in every locale.
- **Locks.**
  - ar and ja `header.logoText` are now the Latin "Side Badger".
  - The "Sidebadger me!" pun is translated in ar, fa, ga, ro and pcm.
  - pcm `home.currency.rate` was Icelandic ("Gengi") and is now "Rate".
  - `identicalApproved` was updated to match. `npm run i18n audit` and `content-audit` both pass.
- **Open points for fluent reviewers** are in `docs/fluent-review-notes.md`, along with the 16 locales not reviewed.

## Verification

- **Audits:** `npm run i18n -- audit` and `npm run i18n -- content-audit` exit 0.
- **Verify:** strict `npm run verify` is recorded in the landing commit.

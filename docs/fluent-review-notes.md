# Notes for fluent reviewers

This is the input for the detailed human translation review planned before a marketing drive (follow-ups, "Fluent review"). On 20 November 2026, Codex reviewed 22 locales in full, reading every UI key and every content entry against the English. Its fixes were back-checked blind by separate agents and recorded as `checked` by `CX-review`. The review did not mark anything `reviewed` (D8, D31), so every locale is still `noindex`.

- **Reviewed:** ar, bn, cy, da, de, es, eu, fa, fr, ga, hi, it, ja, ko, nl-BE, no, pcm, pt, ro, te, ur and zh.
- **Not reviewed yet:** cs, el, fi, hr, hu, id, is, lv, ph, pl, sl, sr, sv, sw, tr and uk. The owner deferred them on 20 November 2026.
- **Site-wide rule confirmed:** prose uses Western digits in every locale, matching `src/components/content/money.ts`. The ar and fa reviewers converted digits to Arabic-Indic; that was reverted.
- **Score:** each verdict line rates the locale before the fixes, from 1 (poor) to 5 (reads natively).

Each section below holds the reviewer's verdict and the points it left for a fluent human.

## ar

ar: 4/5 — Generally fluent; the main defects were literal idioms, inconsistent brand spelling, several meaning slips and English-style number formats.

- Brand question (`header.logoText`, `notFound.meta.title`, and the three `policy.*.meta.title` keys): use **Side Badger** in Latin script throughout. This preserves the protected product name and agrees with the majority of the locale and all content entries. The five older Arabic-script spellings were changed.
- Terms question (`pricing.faq.q2.answer`): retain an Arabic translation of the quotation for an Arabic reader, and explicitly identify it as a translation. The English policy remains the original. A fluent human should check the exact legal register of the translated quotation; no guarantee of remaining free was added.
- Tone choices for a fluent human: `home.cta.title`, `art.howToSplitRentByRoomSize.sticky`, and `content/guides/how-to-collect-for-a-group-gift` → `cta.heading`. These are adaptations of English wordplay and are marked medium confidence in the table.
- `content/features/receipt-scanning` → `sections[3].body` and `limits.items[6]`: retained the technical wording for Google's US multi-region. A fluent technical reviewer should confirm the preferred Arabic regional-infrastructure term.
- English-source conflicts, left outside the permitted edit scope: `content/use-cases/group-trips` → `lead` still says 138 other currencies in English, and `content/features/multiple-currencies` → `sections[2].body` says 139 other options. The approved registry says 133 total. Arabic now uses 131 besides pounds and euros, and 132 besides a single selected currency, rather than repeating the stronger stale claim.
- `content/guides/how-to-split-a-stag-or-hen-weekend` → `sections[5].items[3]`: the English phrase ‘keeps the money’ is ambiguous against the approved no-money-handling claim. Arabic now explicitly means keeping the account, consistent with the page and registry.
- Numbers follow the configured ar-EG locale: Arabic-Indic digits, Arabic grouping/decimal separators, Arabic percent sign, and currency symbols after amounts in prose. `tools.split.errorAmountInvalid` retains the literal input example `12.50`; it describes typed input syntax. Numeric YAML data, dates, IDs and app label wording were preserved.
- Chat and artwork are intentionally lighter than the main imperative prose. No fluent human or rendered RTL layout review was performed, and no content was marked `reviewed`.

## bn

bn: 3/5 — Understandable and mostly faithful, with recurring literal phrasing, several meaning errors, and currency-format drift.

- `pricing.faq.q2.answer`: retained the exact English legal quotation. The linked policy is English-only, and the Bengali lead-in accurately explains advance notice before any pricing change. Recommend keeping the original quotation; a Bengali paraphrase should be labelled as such rather than presented as the authoritative terms.
- `content/use-cases/group-trips` → `lead`: English says pounds, euros and 138 other currencies, implying 140, while the registry and heading say 133. Bengali preserves the English figure; resolve the English-source discrepancy before synchronising this field. Currency-count metadata was not silently changed.
- `content/features/multiple-currencies` → `sections.2.body`: English and Bengali likewise say “139 other options”, implying 140 currencies. Resolve this together with the preceding source discrepancy; the locale still mirrors its source.
- Number convention: `bn` is configured as `bn-BD`. Prose now follows its suffix currency placement and South Asian grouping. Latin digits remain deliberate: `src/components/content/money.ts` and the rent calculator explicitly specify `numberingSystem: 'latn'` to match translated prose. Numeric YAML data, IDs, placeholders, Markdown destinations, `review` and `translatedFrom` remain unchanged.
- `content/features/web-app` → `workflow.steps.1.body`: “অন্যান্য ডিভাইস” was not found in the primary app catalogue; it may come from the installation-instructions package. Confirm the external label before changing it.
- `content/features/plan-together` → `sections.4.body`: “নৌকাভ্রমণ কি সত্যিই মূল্যবান” remains a little stiff for whether the boat trip is worth its price; left unchanged because the meaning is intelligible and a different phrasing would need a tone judgement.
- `content/features/groups-and-permissions` → `sections.1.body`: “কুশীলব-তালিকা” retains the cast-list joke but is literary; confirm its register.
- `content/use-cases/housemates` → `sections.0.body`: “জানালাওয়ালা আলমারি” follows the English tiny-bedroom joke; confirm that it lands naturally.
- `art.howToSplitRentByRoomSize.sticky` and the room-size guide: “বক্স রুম” is retained as the established UK housing term; a fluent reader can judge whether a Bengali description of a very small bedroom is clearer.
- App wording such as “সব শোধ করুন” and “সঠিক পরিমাণ” is retained or restored despite stylistic alternatives, because the brief requires app-mirroring labels.

## cy

cy — Verdict: 3/5 — Generally clear, with literal idioms and inconsistent poll terminology.

- `pricing.faq.q2.answer`: Keep the translated excerpt, explicitly labelled as a translation (fixed here). The linked English terms remain the authoritative original. This is not a legally reviewed Welsh policy.
- `home.cta.title`: “Sidebadger me!” is unchanged from English. A fluent Welsh copywriter should judge whether to adapt this brand wordplay.
- `a11y.breadcrumb`: Confirm whether “Briwsion bara” is the preferred accessibility label in context; not changed on preference alone.
- Currency-count phrases such as `home.hero.lede` and `pricing.free.feature3`: Confirm whether “133 o arian cyfred” should use “math o arian cyfred”. No blanket rewrite was made without stronger linguistic confidence.
- `content/features/multiple-currencies`, `sections.2.body`: English itself says 139 other options while the approved total is 133. Preserved the source number; resolve in English first.
- `content/use-cases/group-trips`, `lead`: The source link says pounds, euros and 138 other currencies, inconsistent with 133 total. Preserved the complete Markdown link as required.
- The existing courteous chi register and ordinary Welsh verb-noun instructions are retained. Verb-noun instructions were not systematically rewritten for taste.

## da

da — 4/5: Generally fluent, with recurring English calques, some grammar defects and app-label mismatches.

- `pricing.faq.q2.answer` (Fluent review question): retain the verbatim English quotation. The legal policy is English-only; the surrounding Danish accurately says changes will be announced first. Translating the quotation is optional, but it should then be identified as an unofficial translation. `pricing.meta.description` now explicitly refers to notice rather than suggesting a promise of permanent free service.
- `home.cta.title`: kept the coined “Sidebadger mig!” from the English brand joke. A fluent human should confirm that this lands naturally with the intended audience.
- Source inconsistency, unchanged: `content/use-cases/group-trips` (`lead`) says pounds, euros and **138 other currencies**, while the page title and approved registry say **133 currencies**. `content/features/multiple-currencies` (`sections.2.body`) says **139 other options**. Both translations follow those English numbers. The source owner should reconcile these counts before synchronized translation changes.

## de

de: 4/5 — Strong overall; recurring literal phrasing, a few grammar defects and small app-label mismatches.

- `pricing.faq.q2.answer` (Fluent review question): keep the German translation for readability, but identify it explicitly as translated. I added “ins Deutsche übersetzt”; it is not an officially reviewed German policy text. A fluent human should confirm this choice and the quotation's wording. The promise remains advance notice, not guaranteed free service.
- Register (Fluent review question): the marketing prose uses informal du/ihr consistently. `content/guides/what-to-do-when-someone-disputes-a-shared-expense`, `sections.4.items.2` and `sections.5.items.1`, quote **Ihre Frage** because that is the app's exact label. `home.group.scanCode` now also follows the app's formal **Oder scannen Sie diesen Code**. Those quoted UI labels are intentional exceptions; standardize the app first if a completely informal experience is wanted.
- Source inconsistency left unchanged: `content/use-cases/group-trips`, `lead`, says pounds, euros and **138** other currencies inside a protected page link, although the approved total is **133**. `content/features/multiple-currencies`, `sections.2.body`, repeats English's **139** other options. Both match English; coordinate a source correction before changing translations.
- Protected links left unchanged: the repeated pricing link text **was kostenlos abgedeckt ist** is understandable but stiffer than the surrounding prose (`content/features/split-expenses`, `cta.body`, among others). A later coordinated link-text pass could use a more idiomatic expression.
- `content/guides/how-to-split-bills-with-a-partner-who-earns-more`, `sections.4.items.2` and `sections.6.body`: a fluent human should confirm **kleine Extras** in place of the forced-sounding **Gönnungen** (medium-confidence edits).

## es

es: 4/5 — Generally natural; a few meaning, app-label and literal-phrasing defects corrected.

- `pricing.faq.q2.answer` (Fluent review question): deliberately retains the exact English quotation and explicitly introduces it « en inglés ». Recommendation: keep that attribution; the surrounding Spanish explains advance notice. Do not imply the terms guarantee continued free access.
- `home.cta.title`: left « ¡Sidebadgéame! » as the deliberate brand verb matching English. A fluent human should judge whether the joke lands; no replacement made for taste.
- `features/multiple-currencies` `sections.2.body` says 139 other currencies and `use-cases/group-trips` `lead` says pounds, euros and 138 others, while the registry and main copy say 133 total. Both follow English. Left unchanged because resolving the source contradiction is outside this review.
- `home.group.scanCode`: the app label « O escanee este código » uses usted within otherwise predominantly tú copy. Matched it exactly as the brief requires; surrounding marketing remains informal. Other formal app labels quoted in help prose are also retained.
- `features/web-app` `options.items.0.body` / `options.items.1.body`: browser menu labels vary by browser and version. These are browser labels, not app catalogue labels; kept the existing wording without claiming a device check.
- `guides/how-to-split-a-stag-or-hen-weekend` `sections.0.body` / `sections.1.body`: retained generic masculine agreement for the named friends because the source does not explicitly establish each person's gender. A human can decide whether the scenario should consistently use feminine forms.

## eu

eu — Verdict: 3/5 — Meaning is broadly preserved, but case, auxiliary and terminology errors recur.

- `pricing.faq.q2.answer`: Keep the Basque excerpt, explicitly labelled as a translation (fixed here). The linked English terms remain the authoritative original. This is not a legally reviewed Basque policy.
- `home.cta.title`: “Sidebadger me!” is unchanged from English. A fluent Basque copywriter should judge whether to adapt this brand wordplay.
- Receipt terminology now follows the app’s ordainagiri. In `content/pages/features`, `sections.0.body`, the existing `[Tiketen eskaneatzeak nola funtzionatzen duen](page:feature/receipt-scanning)` label is deliberately preserved because the brief requires complete Markdown links to remain exact. This is the remaining receipt synonym in a protected link.
- `content/features/settle-up`, `limits.items.1` and `faq.items.4.q`: “ordainketa kopuru txikiena posiblea” is understandable but stiff. A fluent reviewer should judge a natural replacement while preserving the explicit lack of a minimum-payment guarantee.
- `art.howToCollectForAGroupGift.sticky`: Confirm whether “Mutur luzerik ez” lands as playful wordplay in this short caption.
- `content/features/multiple-currencies`, `sections.2.body`: English itself says 139 other options while the approved total is 133. Preserved the source number; resolve in English first.
- `content/use-cases/group-trips`, `lead`: The source link says pounds, euros and 138 other currencies, inconsistent with 133 total. Preserved the complete Markdown link as required.
- The informal zu register, app labels such as Balantzeak and Likidazioak, decimal commas, grouped thousands and leading percent signs are retained. General prose may use saldo; named app sections retain Balantzeak.

## fa

fa: 3/5 — Understandable throughout, with recurring literal phrasing, a few meaning and grammar errors, and English-style number formats.

- Terms question (`pricing.faq.q2.answer`): retain a Persian translation of the quotation for a Persian reader, and explicitly identify it as a translation. The English policy remains the original. A fluent human should check the exact legal register of the translated quotation; no guarantee of remaining free was added.
- Tone choices for a fluent human: `home.cta.title`; `content/guides/how-to-collect-for-a-group-gift` → `cta.heading`; and the small-room chair joke in `content/pages/rent-split-calculator` → `sections[3].items[0]` and `content/guides/how-to-split-rent-by-room-size` → `sections[4].items[0]`. These adaptations are marked medium confidence.
- `content/features/receipt-scanning` → `sections[3].body` and `limits.items[6]`: retained the technical wording for Google's US multi-region. A fluent technical reviewer should confirm the preferred Persian regional-infrastructure term.
- English-source conflicts, left outside the permitted edit scope: `content/use-cases/group-trips` → `lead` still says 138 other currencies in English, and `content/features/multiple-currencies` → `sections[2].body` says 139 other options. The approved registry says 133 total. Persian now uses 131 besides pounds and euros, and 132 besides a single selected currency, rather than repeating the stronger stale claim.
- Numbers follow the configured fa-IR locale: Persian digits, Arabic grouping/decimal separators, Arabic percent sign, and currency symbols after amounts in prose. `tools.split.errorAmountInvalid` retains the literal input example `12.50`; it describes typed input syntax. Numeric YAML data, dates, IDs and app label wording were preserved.
- App labels intentionally preserve app terminology even where surrounding prose uses a different natural term: for example **موجودی‌ها** as the named Balances screen, versus **مانده** in explanatory prose. The managed-group preset is quoted exactly as **گروه مدیریت شده**. The scanning text **در حال تجزیه رسید...** follows the app even though a fluent reviewer might prefer a fuller phrase; changing the upstream app is outside scope.
- Conversational artwork and chat (`art.*`, `home.chaos.*`) coexist with polite plural instructions in the main prose. That is intentional character dialogue, not a wholesale change of register. A fluent human should confirm the casual slang in `art.groupsAndPermissions.sticky` and `art.howItWorks.reply`; it was not changed for taste.
- Several longer paragraphs still track the English sentence structure closely, for example `content/features/groups-and-permissions` → `sections[0].body` and `content/features/plan-together` → `problem.body`. They remain understandable; a fluent human can judge whether further changes would address a real naturalness defect or merely preference. No fluent human or rendered RTL layout review was performed, and no content was marked `reviewed`.

## fr

fr: 4/5 — Clear and faithful overall; recurring literal phrasing and a few grammar defects corrected.

- `pricing.faq.q2.answer` (Fluent review question): the French quotation is a faithful translation, rather than the English original. I labelled it « traduction de l'anglais ». Recommendation: retain the accessible French rendering with that label; only the English policy is authoritative. The promise remains advance notice of future changes, not guaranteed free access.
- `home.cta.title`: left « Sidebadgez-moi ! » as the deliberate brand verb matching English. A fluent human should decide whether this joke lands; no replacement made for taste.
- `features/multiple-currencies` `sections.2.body` says 139 other currencies and `use-cases/group-trips` `lead` says pounds, euros and 138 others, while the registry and main copy say 133 total. Both follow English. Left unchanged because resolving the source contradiction is outside this review.
- `features/groups-and-permissions` and guide instructions: preserved app labels even when their capitalization or French is awkward. Applied only the brief's explicit `recordSettlement` exception (« Enregistrer le règlement »).
- `pricing.limits.amount.value` and multi-currency pages: retained « rupiah » as the Indonesian currency, rather than accidentally changing it to the Indian rupee. A human may prefer « roupie indonésienne » consistently.
- `guides/how-to-split-a-stag-or-hen-weekend` `sections.0.body` / `sections.1.body`: retained generic masculine agreement for the named friends because the source does not explicitly establish each person's gender. A human can decide whether the scenario should consistently use feminine forms.

## ga

ga: 3/5 — Readable, with recurring English calques, grammatical errors and terminology drift.

- `pricing.faq.q2.answer`: retained the exact English quotation, introduced with “i mBéarla”. This answers the Fluent review question: quote the English-only terms directly, while keeping the surrounding explanation in Irish. No promise of perpetual free service has been introduced.
- `home.expenses.scanning` and `content/features/receipt-scanning` (`workflow.steps.1.body`, `workflow.steps.1.shotAlt`): used “Admháil á anailísiú...” consistently, following the explicit exception for the app’s ungrammatical “Ag anailísiú admháil...”. App-facing “Socraigh”, “Socrú gasta” and “Taifead Socrú” are retained; ordinary prose uses idiomatic debt-clearing wording.
- Existing page-link labels containing “socrú suas” or “socraigh suas” were left exactly as supplied, in accordance with the brief’s instruction to preserve `[text](page:<id>)` links. Examples: `content/features/split-expenses` (`faq.items.5.a`), `content/pages/how-it-works` (`lead`, `faq.items.2.a`) and `content/guides/how-to-collect-for-a-group-gift` (`sections.2.body`). These labels merit a fluent human’s decision in a separately authorized pass.
- `content/guides/how-to-split-a-stag-or-hen-weekend` (`meta.title`, `h1`, `navLabel`) and `content/use-cases/group-trips` (`sections.4.heading`): retained “stag” and “hen”. A fluent human should judge whether these familiar English event terms suit the intended Irish-speaking audience.
- `art.howToSplitRentByRoomSize.sticky` and `content/pages/rent-split-calculator` (`sections.0.items.0`, `sections.3.items.0`): changed literal cupboards to small bedrooms. These are medium-confidence tonal changes; a fluent human may prefer a natural Irish joke that still identifies a bedroom. The adapted `home.cta.title` also needs a human tone check.
- `content/features/multiple-currencies` (`sections.2.body`) and `content/use-cases/group-trips` (`lead`): the English itself says 139 other currencies and 138 other currencies respectively, despite the approved 133-currency total. The translations retain the source numbers and protected links. This source inconsistency needs an owner decision.

## hi

hi — 4/5: Generally clear and faithful; literal idioms, a few grammar errors and app-label mismatches needed correction.

- `pricing.faq.q2.answer` (Fluent review question): kept the exact English quotation of the English-only terms. The preceding Hindi says today’s service is free and future changes require notice; it does not guarantee permanent free access. Recommend keeping a verbatim English quote unless a human approves an explicitly labelled Hindi translation.
- `art.*`, `home.cta.title`, and `content/guides/how-to-split-a-stag-or-hen-weekend` (`meta.title`, `h1`, `navLabel`): the cheeky “Sidebadger me!” slogan and the British “स्टैग/हेन” vocabulary were left intact rather than changed for taste. A fluent reader should judge whether these work for the intended Hindi-speaking audience.
- `content/features/multiple-currencies`, `sections.2.body`, says “139 other options”; `content/use-cases/group-trips`, `lead`, says pounds, euros and 138 other currencies. These match the English but conflict with the registry’s 133-currency total. Left unchanged because resolving the English claim is outside this locale-only brief.
- `content/pages/features`, `sections.4.items.0` and `sections.4.items.7`, mirrors English statements about planned payment requests and social sign-in; the registry restricts marketing of planned features. This is a source-copy decision, not a translation to silently change.
- This is an agent review, with agent-authored corrections; it is not named fluent-human approval. No YAML review status or translatedFrom value was changed.

## it

it: 4/5 — Generally fluent; recurring arithmetic calques and a few meaning errors needed correction.

- `pricing.faq.q2.answer` (Fluent review question): retained the existing Italian translation of the terms quotation and explicitly labelled it a translation from English. It accurately promises advance notice, not continued free service. A fluent human should confirm whether to keep this clearly labelled translation or quote the authoritative English instead; the linked legal policy remains English-only.
- `content/use-cases/group-trips` → `lead` says pounds, euros and 138 other currencies, while the same page and the approved registry say 133 currencies in total. `content/features/multiple-currencies` → `sections.2.body` likewise retains the English master's 139 other options. These are source contradictions, not translation changes; left untouched for the English owner to resolve.
- `home.cta.title`: left the intentional brand verb “Sidebadgerami!” unchanged. A fluent human can confirm that it lands naturally enough for the cheeky site voice.

## ja

ja: 4/5 — Generally clear; literal idioms and inconsistent cost terminology needed fixes.

- `pricing.faq.q2.answer`: both locales currently quote a translation of the English terms. I recommend a translated quotation for readability, explicitly identified as an informal translation; the English policy remains authoritative. The existing quotation preserves the right to introduce fees and the promise of reasonable notice. I left it unchanged because adding that explanatory qualification is an editorial decision beyond a translation correction.
- `content/features/multiple-currencies`, `sections.2.body`, and `content/use-cases/group-trips`, `lead`: English says 139 other currencies and pounds/euros plus 138 others, respectively, while the headline claim is 133. Both translations faithfully retain those English numbers. Resolve the English inconsistency before synchronizing the locales; I did not change the source or silently replace its figures.
- `home.cta.title`: retained the English branded slogan `Sidebadger me!`, which is already explicitly listed in each locale's `identicalApproved`. A fluent human can judge whether the branded wordplay lands; I did not alter approvals.
- App terminology: retained 経費 in quoted app controls and 支出 in general prose. This is deliberate app-label matching, not a proposal to change the app's Japanese catalogue. `home.settle.note` and the trip-settlement guide now include the app's full メモ(任意) wording.
- `content/compare/splitwise`, `sections.0.items.1`, `table.rows.7.other`, and related mentions: retained 持ち分（シェア） for share-weight splitting. A human familiar with Splitwise's Japanese interface should confirm that technical term; Side Badger does not offer that split mode.
- `content/guides/how-to-collect-for-a-group-gift`, `meta.title`, `h1`, and other gift references: retained the understandable みんなでの贈り物 formulation. A human may prefer みんなで贈るプレゼント, but I treated that as taste rather than a necessary correction.
This is an agent language-review pass, not a named fluent-human review. Existing review and translatedFrom blocks were left untouched; this report does not change their provenance.

## ko

ko: 4/5 — Generally clear; literal idioms and reminder wording needed fixes.

- `pricing.faq.q2.answer`: both locales currently quote a translation of the English terms. I recommend a translated quotation for readability, explicitly identified as an informal translation; the English policy remains authoritative. The existing quotation preserves the right to introduce fees and the promise of reasonable notice. I left it unchanged because adding that explanatory qualification is an editorial decision beyond a translation correction.
- `content/features/multiple-currencies`, `sections.2.body`, and `content/use-cases/group-trips`, `lead`: English says 139 other currencies and pounds/euros plus 138 others, respectively, while the headline claim is 133. Both translations faithfully retain those English numbers. Resolve the English inconsistency before synchronizing the locales; I did not change the source or silently replace its figures.
- `home.cta.title`: retained the English branded slogan `Sidebadger me!`, which is already explicitly listed in each locale's `identicalApproved`. A fluent human can judge whether the branded wordplay lands; I did not alter approvals.
- `content/compare/splitwise`, `sections.0.items.1`, `table.rows.7.other`, and other by-shares mentions: retained 지분별. A human familiar with expense-sharing terminology should confirm whether 가중치별 is clearer; this is a non-offered Side Badger mode, and I avoided inventing a new UI term.
- Booking deposits now use 예약금 consistently in venue and accommodation passages. A human should confirm this localization choice against the intended travel scenario, particularly `home.chaos.chatDeposit`, which refers to a refund; a refundable damage/security deposit would instead be 보증금.
- `content/features/plan-together`, `sections.2.body`, and worked-example prose elsewhere: retained the existing £-amount particle convention, which reads the symbol as 파운드. A fluent editor can confirm whether that convention or spelling out 파운드 reads better throughout; amounts and punctuation were preserved.
- Retained polite Korean with both 합니다 and 해요 endings, as the locale already uses; dialogue remains casual. `home.settle.note` and the trip-settlement guide now include the app's full 메모(선택 사항) label.
This is an agent language-review pass, not a named fluent-human review. Existing review and translatedFrom blocks were left untouched; this report does not change their provenance.

## nl-BE

nl-BE: 4/5 — Mostly natural Belgian Dutch; recurring calques, a few agreement defects and small app-label mismatches.

- `pricing.faq.q2.answer` (Fluent review question): retain the original English quotation. It matches the English-only terms and avoids presenting a Dutch translation as an official legal text. A fluent human may prefer a Dutch rendering, but it should then be explicitly labelled as a translation. No change to this key was needed.
- Register: keep the existing informal je/jij marketing voice. **Uw vraag** in `content/guides/what-to-do-when-someone-disputes-a-shared-expense`, `sections.4.items.2` and `sections.5.items.1`, is the app's exact field label. Likewise **Poll toevoegen**, **Poll sluiten** and **Poll heropenen** are app labels; prose consistently uses **peiling**. These are intentional label/prose distinctions.
- Source inconsistency left unchanged: `content/use-cases/group-trips`, `lead`, says pounds, euros and **138** other currencies inside a protected page link, although the approved total is **133**. `content/features/multiple-currencies`, `sections.2.body`, repeats English's **139** other options. Both match English; coordinate a source correction before changing translations.
- Protected links left unchanged: **wat gratis dekt** / **Wat gratis dekt** is a clear calque in pricing links (`content/features/receipt-scanning`, `faq.items.2.a`; `content/features/split-expenses`, `cta.body`; `content/features/web-app`, `cta.body`; `content/guides/how-to-split-rent-by-room-size`, `cta.body`; `content/guides/how-to-split-bills-with-a-partner-who-earns-more`, `cta.body`). Prefer **wat er gratis bij zit** in a later pass that authorizes link-text changes.
- `content/compare/splitwise`, `sections.0.items.1`, `sections.2.items.4` and `table.rows.7`: **aandelen** for weighted shares can suggest financial shares. I left it because it consistently mirrors the source concept; a fluent human could confirm **verhoudingen** as a clearer alternative. No financial-share feature is implied by the underlying English.

## no

no — 4/5: Generally fluent Bokmål, with recurring English calques and incorrect percentage spacing.

- `pricing.faq.q2.answer` (Fluent review question): retain the Norwegian translation for readability, now explicitly introduced as an unofficial translation of the English-only terms. It preserves the right to introduce fees and the promise of reasonable notice; it does not guarantee permanent free service. A fluent human may instead prefer the verbatim English quotation. `pricing.meta.description` now makes the notice promise explicit.
- `home.cta.title`: kept the coined “Sidebadger meg!” from the English brand joke; fluent-human tone approval is still useful.
- `content/pages/how-it-works` (`meta.description`, `lead`, `cta.heading`), `content/use-cases/housemates` (`faq.items.2.a`) and `tools.split.summarySettled`: retained the existing “kvitt” wording for being square. A fluent human should confirm its naturalness against “skuls” or “alt er gjort opp”; the incomplete “Tre steg til kvitt” heading was fixed.
- Source inconsistency, unchanged: `content/use-cases/group-trips` (`lead`) says pounds, euros and **138 other currencies**, while the page title and approved registry say **133 currencies**. `content/features/multiple-currencies` (`sections.2.body`) says **139 other options**. Both translations follow those English numbers. The source owner should reconcile these counts before synchronized translation changes.

## pcm

pcm: 4/5 — Readable Nigerian Pidgin with appropriate English borrowings; targeted fixes address calques, a few English clauses and stale app labels.

- Answer to the pcm Fluent review question: confirm 84 and reject 5 of the 89 entries in `src/i18n/locks/pcm.json` → `identicalApproved`, individually recorded above. Rejected values have been fixed in `src/i18n/pcm.ts`; the lock was not edited. Its owner can reconcile these five approvals later.
- Pidgin shares a large amount of ordinary and technical vocabulary with English. Identical short labels, noun phrases and negative slogan fragments do not need invented respellings or a mandatory dem. The decisions above judge each value in context, rather than treating identity alone as a defect.
- `pricing.faq.q2.answer`: retain the English quotation, because it is the actual wording of the English-only terms. The Pidgin introduction explains the present free service and prior-notice promise; it does not guarantee future free service.
- App spellings such as Det, Descripshon, Amaunt, Not, Exact amaunts, Pasentej, Rekod Settlement and Kwik settul are intentionally retained for named controls. Gengi and Change gengi were stale: the current app uses Rate and Change rate.
- `content/guides/how-to-split-rent-by-room-size` → `sections.4.items.0`, and `content/pages/rent-split-calculator` → `sections.3.items.0`: please check the adapted cramped-room joke. Both are medium confidence.
- `home.cta.title`: Sidebadger me! is retained as branded wordplay. A fluent Nigerian reviewer should decide whether that joke lands. Also check audience familiarity with technical headings such as `a11y.footerNavigation`, `a11y.mainNavigation` and `pricing.limits.protection.label`; their grammar is acceptable, but a plainer product-wide terminology choice may help.
- Source-owner follow-up, unchanged here: English `content/features/multiple-currencies` → `sections.2.body` says 139 other currencies, and `content/use-cases/group-trips` → `lead` says pounds, euros and 138 other currencies. Both conflict with the approved 133-currency total. Pidgin follows those source numbers, so correct the English and all locales together.
- Source-owner follow-up, unchanged here: `content/use-cases/couples` → `sections.0.items.3` says real pay slips in English, while the linked guide uses a fictional example; Pidgin currently mirrors that claim.

## pt

pt: 4/5 — Generally fluent European Portuguese; occasional Brazilian wording, calques and meaning errors needed correction.

- `home.worlds.body` (Fluent review question): changed “enquetes” to “sondagens”, the established European Portuguese term. No remaining use of enquetes was found in the assigned locale files.
- `pricing.faq.q2.answer` (Fluent review question): retained the English quotation, already introduced explicitly as English. This preserves the authoritative legal wording while the Portuguese lead-in states that changes require notice. Recommend keeping it in English unless the owner adopts a clearly labelled translated quotation across locales.
- `home.group.scanCode`: retained “Ou leia este código” exactly as the project's explicit pt exception requests, despite the surrounding informal tu register. Other app labels were read against the app's Brazilian Portuguese catalogue and the site's European Portuguese exception.
- `content/use-cases/group-trips` → `lead` retains pounds, euros and 138 other currencies, although the approved total is 133; `content/features/multiple-currencies` → `sections.2.body` retains the English master's 139 other options. These source contradictions need resolution by the English owner.
- `home.cta.title` (“Sidebadgeia-me!”) and the repeated tourism loanword “villa” (for example `content/use-cases/group-trips` → `lead`): left unchanged rather than imposing a stylistic preference. A fluent Portuguese reader should confirm the brand joke and whether villa or moradia better fits the intended audience.

## ro

ro: 4/5 — Generally fluent; isolated calques, agreement errors and app-label inconsistencies.

- `pricing.faq.q2.answer`: the quotation remains in Romanian and is now explicitly marked “în traducere”. This answers the Fluent review question: a translated quotation is useful here when clearly identified as a translation; the English-only terms remain the authoritative wording. The formal address inside that quotation is retained as part of its legal register.
- `art.howToSplitRentByRoomSize.sticky`, `content/guides/how-to-split-rent-by-room-size` (`sections.4.heading`, `sections.4.items.0`), and `content/pages/rent-split-calculator` (`sections.0.items.0`, `sections.3.items.0`): retained the joking “debara” for a very small bedroom. A fluent human should confirm that this exaggeration lands naturally across these surfaces.
- `pricing.limits.protection.value`: retained “limită de rată” because the technical meaning is intact. A fluent human could judge whether a less technical Romanian expression would be clearer.
- `content/features/multiple-currencies` (`sections.2.body`) and `content/use-cases/group-trips` (`lead`): the English itself says 139 other currencies and 138 other currencies respectively, despite the approved 133-currency total. Both translations retain those source numbers; the latter is inside a protected page link. This source inconsistency needs an owner decision.

## te

te: 3/5 — Generally understandable and faithful, with recurrent literal idioms, app-label drift and number-grouping errors.

- `pricing.faq.q2.answer`: retain the exact English legal quotation. The preceding Telugu sentences explain that everything is free today and that changes receive advance notice; the policies themselves are English only. A Telugu paraphrase would need an explicit editorial/legal decision and should be labelled as a paraphrase rather than presented as the original wording.
- `home.cta.title`: retained the English brand pun “Sidebadger me!”. A fluent Telugu copywriter should decide whether to replace this recurring brand slogan with a local call to action.
- `content/use-cases/group-trips — lead`: retained “138 other currencies” because it matches the English source, but pounds plus euros plus 138 others totals 140, conflicting with the approved 133-currency claim. `content/features/multiple-currencies — sections.2.body` similarly keeps the source's “139 other options”. These require an English-source decision, outside this review's edit scope.
- `content/features/groups-and-permissions` and related use-case prose: the app's Managed preset is literally `ప్రీసెట్: నిర్వహించబడేది`. Matched its operative name, using quotation marks and “preset” where prose needs it. The participial app label is awkward but the brief requires mirroring the app; any rename belongs in the app first.
- `content/guides/how-to-split-a-stag-or-hen-weekend` and `content/use-cases/group-trips — sections.4.heading`: adapted unfamiliar British stag/hen terminology to bachelor/bachelorette-party wording. Please confirm the preferred local borrowing and cultural tone.
- `content/features/receipt-scanning — problem.body`, `content/use-cases/couples — sections.1.body`, and the room-size copy: adapted literal jokes about six drinks rounds, itching numbers and a “hopeful chair”. The new wording preserves the situation; a fluent human can judge the final comic timing.
- `content/guides/how-to-split-rent-by-room-size — sections.4`: retained the borrowing `ఎన్-సూట్లు`; the following sentence explains rooms with a private bathroom. Confirm whether this term is familiar enough for the intended audience.

## ur

ur — 3/5: Understandable and mostly faithful; recurring literal calques and several grammar and meaning errors needed correction.

- `pricing.faq.q2.answer` (Fluent review question): kept the Urdu translation of the quoted terms, but changed the introduction to “ہماری شرائط کا ترجمہ:” so it is not presented as the actual wording of the English-only policy. Recommend this explicit translation label. The quotation reserves future fees with notice; it does not guarantee permanent free access.
- `home.group.joined` follows the app’s `activityFeed.events.member-joined-self-short` wording, “{name} شامل ہوا”. Its masculine form can be awkward for a female name. Left unchanged to follow the app-mirroring requirement; a human should decide with the app owner on a gender-neutral alternative.
- `content/features/groups-and-permissions`, `sections.2.items.0`, and `content/pages/support`, `groups.5.items.1.a`, retain the app’s “گروپ غیر محفوظ کریں” for Unarchive Group. It can suggest making a group unsafe. A clearer term needs an app-level wording decision; the site should continue to mirror it.
- `content/guides/how-to-split-a-stag-or-hen-weekend` (`meta.title`, `h1`, `navLabel`) retains “سٹیگ/ہین”; `content/compare/splitwise` uses “نیٹو” for native apps. These technical/cultural borrowings are understandable in context but merit audience-specific fluent review. `home.cta.title` retains the English “Sidebadger me!” slogan.
- `content/features/multiple-currencies`, `sections.2.body`, says “139 other options”; `content/use-cases/group-trips`, `lead`, says pounds, euros and 138 other currencies. These match the English but conflict with the registry’s 133-currency total. Left unchanged because resolving the English claim is outside this locale-only brief.
- `content/pages/features`, `sections.4.items.0` and `sections.4.items.7`, mirrors English statements about planned payment requests and social sign-in; the registry restricts marketing of planned features. This needs a source-copy decision.
- This is an agent review, with agent-authored corrections; it is not named fluent-human approval. No YAML review status or translatedFrom value was changed.

## zh

zh: 4/5 — Generally natural and clear; targeted fixes address literal calques, an ambiguous payment limit and inconsistent app terminology.

- `pricing.faq.q2.answer`: keep the Chinese translation for readability, but identify it as a translation, as this edit now does. The policy itself remains English-only; this marketing quotation does not establish an official Chinese legal text.
- `content/guides/how-to-split-rent-by-room-size` → `sections.4.items.0`, and `content/pages/rent-split-calculator` → `sections.3.items.0`: please check the adapted cramped-room joke. Both replacements are medium confidence; the literal hopeful chair was not idiomatic Chinese.
- App-mirrored formal labels such as 您的问题 and 您的反馈 are intentionally retained even though surrounding site prose uses 你. Expense UI labels such as 添加费用 are also intentionally retained; prose generally uses 支出.
- Source-owner follow-up, unchanged here: English `content/features/multiple-currencies` → `sections.2.body` says 139 other currencies, and `content/use-cases/group-trips` → `lead` says pounds, euros and 138 other currencies. Both conflict with the approved 133-currency total. The Chinese follows those source numbers, so correct the English and all locales together.
- Source-owner follow-up, unchanged here: `content/use-cases/couples` → `sections.0.items.3` says real pay slips in English, while the linked guide uses a fictional example; Chinese currently mirrors that claim.

## Added by the coordinator

- Resolved: the English currency counts the ar and bn reviewers flagged (group-trips `lead`, multiple-currencies `sections[2].body`) now say 131 and 132 other currencies, consistent with 133 in total, in every locale.
- ar: the reviewer's note about Arabic-Indic digits no longer applies. Prose uses Western digits.
- fa: `art.planTogether.question` and `art.planTogether.reply`. The reviewer changed "drinks" to "wine" to match the English joke, and ar, ur and tr already say wine. Confirm that it suits a Persian audience.
- ar and ja: `header.logoText` is now the Latin "Side Badger", consistent with the rest of each locale. This answers the open question about Arabic script for ar.

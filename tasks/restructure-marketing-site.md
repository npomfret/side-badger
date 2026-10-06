# Restructure the marketing website

## Status

Planned

## Objective

Restructure the Side Badger marketing site from a homepage-led product brochure into a small, coherent static site with dedicated feature, use-case, and explanatory pages.

The finished site should:

- explain what Side Badger does and why it is useful;
- give important search intents a useful landing page;
- retain the dry, tongue in cheek Side Badger voice;
- show product evidence rather than relying only on claims;
- lead relevant visitors into the external app;
- preserve accessible, localized static output.

## Source plan

Use [the site review and expansion plan](../docs/seo-site-expansion-plan.md) as the design and sequencing reference.

## Inputs

### Available

- Current Astro marketing site.
- Existing English and localized homepage copy.
- Current pricing and policy pages.
- Initial SEO and information-architecture audit.

### Required before final page briefs

- Authoritative product feature list.
- Status of each feature: available, beta, planned, retired, or tenant-dependent.
- Product limits and prerequisites.
- Primary audience and priority markets.
- Approved pricing and fair-use promise.
- Available screenshots, demonstrations, and customer evidence.

Missing feature details do not block the technical SEO repairs, content model, navigation shell, or page templates.

## Bug handling

Fix bugs discovered while completing this task when the cause and correction are within the marketing site and can be verified as part of the same change. Add a regression test when the defect is likely to recur or affects generated output across many routes.

Create a separate task for a defect when it:

- belongs to the external application or another repository;
- requires a product decision unrelated to the restructuring;
- is large enough to obscure or delay the current milestone;
- cannot be verified safely with the available environment or evidence.

Record the separate task before continuing so the defect is not lost. Security, data-loss, accessibility-blocking, and deployment-blocking defects take priority over the planned sequence.

## Proposed information architecture

```text
/
├── how-it-works/
├── features/
│   ├── split-expenses/
│   ├── groups-and-permissions/
│   ├── multiple-currencies/
│   ├── receipts-and-scanning/
│   └── lists-polls-and-comments/
├── use-cases/
│   ├── housemates/
│   ├── couples-and-families/
│   ├── holidays-and-group-travel/
│   ├── parties-weddings-and-gifts/
│   └── clubs-teams-and-work/
├── pricing/
├── privacy/
├── terms/
└── cookies/
```

This is a starting structure. Validate each proposed page against the feature list, available proof, and search intent. Merge or remove pages that would be repetitive or thin.

## Work plan

### 1. Establish measurement and constraints

- [ ] Record current Search Console coverage, queries, impressions, and clicks.
- [ ] Record current app-launch conversion measurement.
- [ ] Establish the permitted privacy-preserving measurement approach.
- [ ] Capture Lighthouse and Core Web Vitals baselines for homepage and pricing.
- [ ] Confirm the canonical URL and trailing-slash policy.

### 2. Repair the technical SEO foundation

- [ ] Add canonical URLs to every indexable page.
- [ ] Add `og:url` and absolute social image URLs.
- [ ] Add a rendered head slot to `BaseLayout.astro`.
- [ ] Restore visible-page-specific JSON-LD for the homepage and pricing page.
- [ ] Generate accurate `og:locale` values for every supported locale.
- [ ] Resolve duplicate regional alias pages through distinct content, canonicalization, redirects, or sitemap exclusion.
- [ ] Align sitemap, `hreflang`, canonical, and localized route generation.
- [ ] Decide whether policy content is pre-rendered or excluded from search.
- [ ] Add build checks for metadata, one `h1`, internal links, schema inclusion, and locale alternates.
- [ ] Fix and verify related defects found while changing shared layouts, routes, metadata, and navigation.

### 3. Create the content model

- [ ] Create a typed feature registry.
- [ ] Record capability, user problem, audience, status, limits, proof, related use cases, and approved claims for each feature.
- [ ] Define typed page metadata and relationships.
- [ ] Choose a maintainable location for long localized page copy.
- [ ] Keep short interface strings in the existing i18n modules.

### 4. Confirm positioning and page briefs

- [ ] Import and validate the authoritative feature list.
- [ ] Confirm the primary audience and strongest differentiators.
- [ ] Research search language and result intent for proposed page clusters.
- [ ] Produce a brief for every approved page.
- [ ] Define the proof and product imagery required by each page.
- [ ] Resolve the “free forever” versus “free until it isn't” promise conflict.

### 5. Build the site shell

- [ ] Add global Features, Use cases, How it works, and Pricing navigation.
- [ ] Add mobile navigation with equivalent access.
- [ ] Expand the footer to expose the new structure.
- [ ] Add reusable feature-page and use-case-page layouts.
- [ ] Add breadcrumbs and contextual related-page links.
- [ ] Preserve current accessibility, RTL, reduced-motion, and locale behaviour.

### 6. Build the first release

- [ ] Rewrite the homepage as a concise overview and route into deeper content.
- [ ] Publish `/how-it-works/` with an end-to-end workflow.
- [ ] Publish `/features/` and the three strongest feature pages.
- [ ] Publish the three strongest use-case pages.
- [ ] Update pricing copy and FAQ.
- [ ] Add optimized screenshots or short demonstrations.
- [ ] Add accurate titles, descriptions, structured data, and social previews.
- [ ] Add clear launch-app calls to action to every marketing page.
- [ ] Add every new content key to every supported translation.
- [ ] Run the translation integrity unit test before the release can merge.

### 7. Expand and maintain translations

- [ ] Review early search and conversion evidence.
- [ ] Publish the remaining validated pages in every supported locale.
- [ ] Translate complete pages, including metadata, examples, alt text, and humour.
- [ ] Keep translation parity as a merge requirement for every later content change.
- [ ] Require fluent review before indexing financial claims and jokes.

## Translation and locale requirements

English is the source content, but localization is part of the page design and implementation rather than a final copy-and-paste step.

- Use `src/i18n/index.ts` as the source of truth for supported locales and aliases.
- Preserve `t('key', locale)` for shared interface text and navigation.
- Define an explicit translated-content type for long-form pages so required fields cannot be omitted silently.
- Never publish English fallback copy at a localized URL as if it were translated content.
- Generate every new page for every supported locale with its title, description, headings, body, calls to action, image alt text, structured data, and internal links translated.
- Make every indexed alternate reciprocal: if page A names page B as an alternate, page B must name page A.
- Treat regional aliases separately from translated locales. Redirect or canonicalize aliases that share identical content instead of indexing duplicates.
- Generate `og:locale`, document language, text direction, dates, and localized URLs from locale metadata rather than hard-coded maps.
- Preserve RTL layout and interaction behaviour for Arabic, Persian, and Urdu.
- Check line wrapping, navigation length, cards, buttons, and heading overflow using both long translations and non-Latin scripts.
- Localize screenshots when the visible product interface materially differs by language. Otherwise use language-neutral imagery.
- Translate examples and humour for cultural meaning. A fluent reviewer must approve financial wording, claims, and jokes before indexing.
- Extend the existing translation integrity unit test to cover any new long-form content store as well as `src/i18n/*.ts`.
- Keep checks for exact key parity, empty values, English placeholders, page-content completeness, route generation, canonical URLs, reciprocal `hreflang`, and sitemap inclusion.
- Run visual checks on representative Latin, CJK, Indic, and RTL locales before release.

### Translation release gate

A content change cannot merge until every supported locale is complete. The existing unit test in `src/__tests__/translations.test.ts` is the mandatory gate and must be extended if content moves outside `src/i18n/*.ts`. Every localized content page must meet all of these conditions:

- all required content and metadata fields are present;
- no source-language fallback is visible;
- its canonical and alternates resolve successfully;
- its internal links point to available localized pages or deliberately to the canonical English resource;
- layout and direction have been visually reviewed;
- `npm run i18n audit` and the new localized-route checks pass.

## Editorial direction

- Write like a capable friend who has survived a disastrous group holiday spreadsheet.
- Use specific situations and occasional dry asides.
- Keep pricing, privacy, security, and product limitations unambiguous.
- Explain customer outcomes instead of implementation details.
- Use the badger motif sparingly.
- Do not make the person who owes money the joke.
- Translate the intent of humour rather than translating it literally.

Example direction:

> Track the villa, the taxi, and the one cocktail round nobody remembers volunteering to buy.

## Out of scope

- Changes to the external Firebase application.
- Publishing a generic high-volume blog.
- Generating one thin page per product feature.
- Indexing untranslated fallback content under localized URLs.
- Claims that cannot be verified against the product.

## Acceptance criteria

- [ ] Every indexable page has a distinct purpose and substantial original content.
- [ ] Every indexable page has one canonical URL, one `h1`, unique metadata, and valid internal links.
- [ ] Sitemap, canonical, and `hreflang` output agree.
- [ ] Visible content and page-specific structured data agree.
- [ ] Navigation exposes the complete public site structure on desktop and mobile.
- [ ] The homepage, feature pages, use-case pages, pricing, and how-it-works pages link to relevant neighbours.
- [ ] Product claims are supported by the approved feature registry.
- [ ] Main workflows include real product evidence.
- [ ] New pages meet the agreed accessibility and production performance thresholds.
- [ ] `npm run build`, translation audit, and automated SEO checks pass.
- [ ] No incomplete translation is submitted for indexing.
- [ ] Representative Latin, CJK, Indic, and RTL pages pass visual review at mobile and desktop widths.
- [ ] Locale aliases, canonical URLs, sitemap entries, and reciprocal `hreflang` links are consistent.
- [ ] Bugs found during implementation are fixed and verified or linked to a separate task with a reason for deferral.

## Initial delivery boundary

The first implementation milestone ends after the technical repairs, navigation and content foundations, revised homepage, how-it-works page, three feature pages, three use-case pages, pricing revision, and supporting product imagery are deployed in every supported locale.

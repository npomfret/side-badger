# Side Badger marketing site expansion plan

## Goal

Turn the current marketing site into a focused static product site that:

- explains the app's breadth without becoming a feature directory;
- creates useful landing pages for distinct search intent;
- moves visitors from a relevant problem to launching the app;
- retains Side Badger's dry, slightly chaotic voice;
- supports localization without publishing thin or duplicate pages.

The feature list is an input to this plan, not a prerequisite for the initial technical and structural work.

## Current-site review

Reviewed from the Astro source, a production build, and the public homepage on 5 October 2026.

### What exists

The public site is larger than a single HTML page at build time, but the product marketing experience is effectively one homepage plus pricing. Privacy, terms, and cookie pages are also generated. Localization expands those five route types to 231 HTML files.

The homepage contains roughly 1,077 visible words and already mentions many product capabilities. Most of those capabilities have no dedicated URL, so search engines and visitors cannot enter through a page that fully answers one need.

### Strong foundations

- Astro produces crawlable static HTML.
- The homepage has one clear `h1` and a sensible heading hierarchy.
- Page titles and descriptions exist and are localized.
- A sitemap and `robots.txt` are generated.
- Core locale pages have `hreflang` links and an `x-default`.
- The homepage copy covers real use cases and differentiators.
- Pricing includes a visible FAQ and clear calls to action.
- Translation keys are complete across every core locale (`npm run i18n audit` passes).
- The brand voice is distinctive. Lines such as “No drama” and “Just vibes and badgers” are memorable.

### Main problems to solve

#### 1. Product content has no useful information architecture

The header only offers the language switcher and app launch button. The footer only links to pricing and legal pages. Features, use cases, and the explanation of how the app works are sections inside the homepage rather than navigable destinations.

The filterable use-case cards make the homepage easier to scan, but they do not create focused landing pages. The same issue applies to high-value capabilities such as multi-currency splitting, receipt scanning, settlements, lists, polls, and permissions.

#### 2. Some copy describes implementation details rather than customer value

The “Little Things” section includes return URLs, focus traps, modal history, pagination, and optimistic behaviour. These are useful product qualities, but the current wording reads like release notes. They should become customer outcomes, supporting proof, or technical trust content where appropriate.

There is also a promise conflict between “free forever” and the disclaimer “It's free until it isn't.” The joke weakens a core commercial claim. Pricing language needs one consistent, defensible promise.

#### 3. Important technical SEO elements are missing or incomplete

- No page emits a canonical URL.
- `og:url` is absent.
- Open Graph and Twitter image paths are relative rather than absolute.
- Homepage `SoftwareApplication` schema and pricing `FAQPage` schema are passed into a named head slot that `BaseLayout.astro` does not render. The built pages contain only the global Organization and WebSite schema.
- `og:locale` is explicitly mapped for only five languages and falls back to `en_US` for the rest.
- Regional aliases such as `/en-gb/`, `/en-us/`, and `/nl-NL/` are placed in the sitemap, but are omitted from the page's `hreflang` set. They duplicate the target locale's copy.
- Legal policy content is fetched in the browser. A crawler initially receives a loading message rather than the policy text.
- URL generation mixes slash and non-slash forms. One consistent canonical form should be enforced.

#### 4. The homepage carries too much of the product story

The homepage is about 75 KB of HTML before assets. It tries to cover audience, use cases, features, workflow, product polish, roadmap, pricing philosophy, and conversion. This dilutes the primary story and makes navigation harder.

The site also ships a 148 KB uncompressed visual-effect JavaScript chunk. That is not automatically a performance problem, but Core Web Vitals should be measured on production before adding more visual work. Large source logo files should not be used directly for social previews or page imagery without optimized derivatives.

#### 5. The site lacks product proof

There are no product screenshots, short demonstrations, worked examples, testimonials, or concrete scenarios showing how a group gets from expense to settlement. Claims such as “balances you can trust” need visible supporting evidence.

## Recommended site structure

Start with a small set of strong pages. Add a page only when it serves a distinct visitor question and can contain original, useful material.

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
├── about/                         optional; publish only with a real story
├── privacy/
├── terms/
└── cookies/
```

Do not create a page for every small feature. Closely related features should reinforce one substantial topic page. The final feature list will determine whether the five proposed feature clusters are correct.

### Page responsibilities

#### Homepage

Answer four questions quickly: what Side Badger is, who it helps, why it is different, and what to do next. Show three to five strongest benefits, a short “how it works,” representative use cases, product proof, pricing summary, and links into deeper pages.

#### How it works

Tell one end-to-end story: create a group, invite people, add and split expenses, then settle up. Use real interface images or short clips. Explain sign-up requirements, supported devices, and what “settle” means.

#### Feature pages

Answer capability-led searches and remove uncertainty. Each page should include the problem, workflow, supported options, constraints, product evidence, relevant use cases, a short FAQ, and a clear launch CTA.

#### Use-case pages

Answer situation-led searches in the reader's language. Each page should use a concrete scenario, show the relevant feature combination, include a worked example, and link back to the applicable feature pages.

#### Pricing

State the current offer and limits precisely. Remove or explain the contradictory “free forever” language. Do not advertise speculative Pro features until the intended offer is firm.

## Voice and editorial rules

The humour should make examples memorable while leaving money, privacy, limits, and security claims unambiguous.

### Voice

- Write like a capable friend who has previously survived a disastrous group holiday spreadsheet.
- Use short dry asides, specific situations, and restrained badger references.
- Let headings and examples carry most of the humour.
- Keep calls to action plain enough that visitors know where they lead.

### Example use-case angles

- **Housemates:** “For the housemate who buys toilet roll, and the housemate who somehow never sees it happen.”
- **Group travel:** “Track the villa, the taxi, and the one cocktail round nobody remembers volunteering to buy.”
- **Couples:** “Share the boring costs without turning date night into a quarterly finance review.”
- **Weddings:** “Split deposits, decorations, and emergency umbrellas. Leave the seating plan to someone braver.”
- **Clubs and teams:** “Collect pitch fees without becoming the person who sends ‘gentle reminder’ messages every Tuesday.”

These are tone samples, not final claims. Final copy should use scenarios the product can genuinely support.

### Guardrails

- Do not hide limits or qualifications inside jokes.
- Avoid jokes at the expense of people who owe money or have less money.
- Avoid repeating the badger motif in every section.
- Prefer demonstrable facts over broad superlatives.
- Translate the intent and joke rather than translating word for word.

## Content model

Create a typed content registry before building pages. This gives the later feature list a clear destination and prevents unsupported marketing claims.

Each feature record should contain:

- stable ID and proposed slug;
- plain-English capability statement;
- user problem solved;
- primary and secondary audiences;
- status: available, beta, planned, or retired;
- limits and prerequisites;
- proof available: screenshot, demo, documentation, or worked example;
- related features and use cases;
- search language to validate during keyword research;
- approved claims and claims requiring verification.

Keep short interface labels in `src/i18n/*.ts`. Store long page copy in a typed Astro content collection or an equivalent TypeScript-backed content layer, organized by locale. This will be easier to review than adding hundreds of long strings to each translation file.

## Delivery plan

### Phase 0 — establish a baseline

1. Connect Google Search Console and submit the sitemap if this has not already been done.
2. Record indexed pages, impressions, queries, clicks, click-through rate, branded traffic, and launch-app clicks.
3. Run Lighthouse and production Core Web Vitals checks on the homepage and pricing page.
4. Record the current conversion event path from landing page to the external app.

**Done when:** there is a dated baseline and launch-app clicks can be measured without adding invasive tracking. If the zero-tracking promise rules out analytics, use privacy-preserving server logs or outbound redirect counts and document that choice.

### Phase 1 — repair the technical foundation

1. Add canonical URLs, `og:url`, absolute social images, and a real layout head slot.
2. Emit page-specific JSON-LD only where it matches visible page content.
3. Correct locale metadata and either canonicalize, redirect, or exclude regional aliases that have identical content.
4. Align sitemap entries, `hreflang`, locale routes, and trailing-slash behaviour.
5. Decide whether policy pages should be pre-rendered at build time or deliberately excluded from search. Prefer pre-rendering if the API is reliable during builds.
6. Add automated checks for titles, descriptions, canonicals, one `h1`, valid internal links, sitemap membership, and locale alternates.

**Done when:** a production build passes the SEO checks and each indexable URL has one self-consistent canonical identity.

### Phase 2 — finalize positioning and page briefs

1. Normalize the supplied feature list into the content registry.
2. Confirm the primary audience and strongest differentiators.
3. Research actual search language, competitors, and result-page intent for the proposed clusters.
4. Merge or remove page ideas that would be thin, repetitive, or unsupported.
5. Write a brief for every approved page: target reader, question answered, primary query family, proof needed, CTA, internal links, title, description, and outline.

**Done when:** every planned URL has a distinct purpose and enough evidence for useful original content.

### Phase 3 — build the core site

1. Add reusable layouts for feature and use-case pages.
2. Expand the header and footer navigation.
3. Rewrite the homepage as a concise route into deeper content.
4. Publish `how-it-works`, the feature overview, the strongest three feature pages, and the strongest three use-case pages.
5. Add real product screenshots or short demonstrations with descriptive alt text and optimized image sizes.
6. Add breadcrumbs and contextual links between related feature and use-case pages.
7. Update pricing copy so the promise and limitations agree.
8. Complete every supported translation before merging the content change.

**Done when:** a new visitor can understand the product, see it working, follow a relevant scenario, and launch the app from every marketing page.

### Phase 4 — expand while preserving translation parity

1. Publish each remaining validated page in every supported locale.
2. Translate metadata, examples, image alt text, structured data, and internal links in the same change.
3. Extend the translation integrity unit test if long-form content moves outside `src/i18n/*.ts`.
4. Require exact content-field parity and reject empty or source-language placeholder values.
5. Have humour and financial wording reviewed by a fluent speaker before indexing.

**Done when:** every indexed localized page is complete, useful in its own right, and linked to its true alternates.

### Phase 5 — publish supporting content selectively

Create articles only when search data or repeated user questions reveal a real need. Good candidates may include practical guides to splitting holiday costs, handling expenses in several currencies, or choosing a fair split method. Avoid a high-volume generic blog.

**Done when:** each article answers a documented question, links to relevant product pages, and has an owner for updates.

## Suggested first release

The first useful release should contain:

1. the technical SEO repairs;
2. revised global navigation;
3. a shorter homepage;
4. `/how-it-works/`;
5. `/features/` plus three evidence-rich feature pages;
6. three distinct use-case pages;
7. corrected pricing promises;
8. screenshots or demonstrations for the main workflow;
9. Complete translations for every supported locale, enforced by the translation integrity unit test.

This release is large enough to establish a coherent site and small enough to learn from real search and conversion data before multiplying pages across every locale.

## Information needed later

The supplied feature list should identify what is live, planned, limited, or tenant-dependent. The following decisions will also affect the final briefs:

- primary audience to win first;
- countries or languages to prioritize;
- the defensible free-tier promise and fair-use limits;
- whether “white label” is part of the public Side Badger offer or only repository history;
- available screenshots, demos, and customer evidence;
- privacy-preserving measurement options already in use.

## Success measures

Review at 4, 8, and 12 weeks after release:

- valid indexed pages versus submitted pages;
- non-branded impressions and clicks by landing page;
- rankings for the intended query clusters;
- launch-app clicks and completed registrations where measurable;
- engagement with screenshots or demonstrations;
- page speed and Core Web Vitals;
- translation and crawl errors;
- pages with impressions but poor click-through, and pages with traffic but poor app-launch conversion.

Traffic alone is not the goal. A successful page attracts a relevant visitor, answers their question accurately, and sends an informed user into the app.

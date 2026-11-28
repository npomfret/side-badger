# AI discovery, product copy and integration documentation

Requested by the owner on 18 November 2026. Status: Markdown delivery, HTML agent metadata and matching Markdown frontmatter are implemented; the production OpenAPI contract is publicly available. The contract now permits browser reads from this site's origin (verified 28 November 2026), so the runtime documentation renderer has its source and CORS input ready. Integration pages, runtime rendering, quickstarts and entitlement verification remain open. The dated product-fact snapshots below are historical evidence, not current availability guarantees.

## Aim

Make Side Badger easy for AI agents to discover and use on a person's behalf. Success means an agent can find the product for a relevant task, assess its fit and account requirements, locate a supported integration, connect with the user's authorization, and complete a supported operation. Recommendations and citations are intermediate signals; successful use is the intended outcome.

Improve the website's product explanations and publish practical documentation for the API, MCP server, and ChatGPT and Claude plugins.

This file records the research discussed on 17 November and the owner's subsequent product direction. It does not authorize publishing unreleased capabilities or imply that marketplace listings are live.

## Confirmed direction and existing work

- **The API will be a Pro account feature.** Document this requirement clearly in pricing, integration overviews, the API quickstart and access/error guidance. The Pro price, quotas and exact entitlement rules are not specified yet.
- **Standalone MCP access and both ChatGPT and Claude plugins are planned.** The plugins combine MCP tools with skills. Explain each route separately so people can choose between direct API integration, an MCP client and a packaged assistant integration.
- **MCP/plugin entitlement is not decided by this task.** Do not infer that they require Pro merely because the API does. Confirm how their underlying access is licensed before writing pricing claims.
- **API ownership — owner clarification, 19 November 2026.** Side Badger is a tenant of the base white-label bill splitter project (`wl-bill-splitter`). The base project owns API implementation and the creation, maintenance and serving of API documentation, including its reference, contract, quickstarts and examples. Carry out that work in the base project. This repository owns the tenant marketing site and tenant-specific package/listing material; its API-documentation responsibility is to render the documentation supplied by the base project.
- **Render upstream documentation dynamically.** Follow the same source-owned approach used for the policies (restructure D10 in [follow-ups](./follow-ups.md); `AGENTS.md` External Dependencies): load API documentation from the base project's supported source at runtime, without committing copies, adding a sync/PR workflow or fetching it during the marketing build. Static page shells must build independently of that source. If it is unavailable, omit the documentation body and show an appropriate unavailable state. Confirm the delivery endpoint/format with the base project rather than inventing one here. Shared API/MCP implementation and skills also remain owned by the base project.
- Reuse [the ChatGPT delivery record](../docs/chatgpt-plugin.md) and [package source](../integrations/chatgpt/README.md). The delivery record describes an existing deployed MCP endpoint and a prepared ChatGPT package, with outstanding verification/submission steps. Recheck current status before implementation; do not rebuild this work from scratch or equate an endpoint/package with a published integration.
- This direction reopens the historical assumptions about there being no Pro tier in [the site design decisions](../docs/marketing-site-design.md#decision-index), particularly D2 and D12. Reconcile affected claims when the offering ships; this task does not establish a public launch date.

## Research findings and writing principles

1. **State the product category, audience and concrete capabilities early.** Give assistants a short, self-contained explanation of what Side Badger does. Retain the site's personality around that explanation.
2. **Write for recognisable tasks and constraints.** Explain equal/exact/percentage splits, selected participants, shared households, group trips, currencies, account requirements and relevant limits. Generic adjectives give an assistant fewer facts on which to base a recommendation.
3. **Answer selection questions directly.** Begin FAQ answers with complete factual sentences. Explain payment recording versus money transfer, installation, connectivity requirements, pricing and limits using verified current behaviour.
4. **Place evidence beside claims.** Use worked examples, screenshots, documented limits and relevant policy links. Verify receipt-scanning and currency-conversion wording; avoid unsupported accuracy or performance claims.
5. **Separate recommendation from operation.** Marketing pages explain when the product fits. Integration docs, tool descriptions and skills explain which supported actions an agent can perform and how.
6. **Keep claims consistent across surfaces.** Homepage, pricing, FAQs, feature pages, API docs, MCP descriptions, skills and plugin listings must agree about capabilities, availability and entitlements.
7. **Treat discoverability improvements as hypotheses to measure.** No wording guarantees recommendation, citation, installation or conversion. Avoid keyword stuffing, hidden instructions or attempts to make an assistant recommend the product irrespective of the user's needs.

### Sources

Research consulted on 17 November 2026; recheck changing platform guidance during implementation.

- [Google: AI features and your website](https://developers.google.com/search/docs/appearance/ai-features): existing SEO foundations, crawlable textual content and structured data matching visible content; no special AI files or schema required for Google's AI search features.
- [GEO: Generative Engine Optimization, KDD 2024](https://arxiv.org/html/2311.09735v3): experimental evidence for citations, quantitative information and quotations; keyword stuffing performed poorly. These are visibility metrics on particular experimental systems, not predicted sales gains or guaranteed results on current assistants. Never invent statistics or quotations to imitate the interventions.
- [Anthropic: Writing effective tools for agents](https://www.anthropic.com/research/writing-tools-for-agents): explicit tool purposes, inputs, outputs, boundaries and evaluation improve tool use. Applying this to website copy is an inference; the direct evidence concerns tools.
- [OpenAI crawler documentation](https://developers.openai.com/api/docs/bots): search discovery and model-training crawler controls are separate. Check search access through robots.txt and hosting/CDN rules rather than assuming training access is required.
- [llms.txt proposal](https://llmstxt.org/): an optional documentation aid, not a requirement for Google AI search or a demonstrated ranking boost.
- [Cloudflare: Markdown for Agents](https://developers.cloudflare.com/fundamentals/reference/markdown-for-agents/) and [documentation delivery](https://developers.cloudflare.com/docs-for-agents/): examples of serving Markdown through `Accept: text/markdown` and explicit Markdown links. Consulted 18 November 2026; this establishes a useful delivery pattern, not a discoverability guarantee or a requirement to use Cloudflare.
- [HTTP semantics, RFC 9110](https://www.rfc-editor.org/rfc/rfc9110.html): content negotiation, media-type preferences and `Vary` semantics.

## Implementation checklist

### 1. Establish current product facts

- [x] Obtain the API contract and supported MCP tool/skill inventory. Record the source version and distinguish available, preview and planned functionality.
  - MCP inventory done (ten tools and shared skill, source revision recorded below). The production API contract is now available at `https://app.sidebadger.me/api/docs`; OpenAPI 3.1.0, API version 1.0.0. Current delivery evidence and remaining release/entitlement checks are below.
- [ ] Confirm Pro activation, API authentication, access revocation, quotas/rate limits, account and group permissions, and behaviour when Pro expires or is downgraded. Document supported behaviour rather than designing it in marketing copy.
  - The 19 November application review is a historical baseline. The published OpenAPI contract now describes authentication per operation; that no longer waits for an upstream contract. Pro entitlements, billing, quotas and downgrade/expiry behaviour still need current upstream verification and must not be inferred from the contract's availability.
- [x] Confirm whether MCP and each plugin require Pro, which clients are supported, and which installations/listings are actually public.
  - Confirmed 19 November: MCP has no Pro or other entitlement check (any verified account can link); ChatGPT and Claude are the target clients; nothing is public. Whether MCP/plugins should be Pro is an open owner decision (Dependencies).
- [ ] Reconcile stale or contradictory content. A candidate identified during research is the how-it-works currency explanation versus newer conversion wording; verify against the current app before changing it.
  - The established currency/conversion/count/limit corrections were implemented on 19 November, and the AI-assistant registry now records the owner's 22 November production confirmation. The dated list below records those fixes; remaining upstream policy and future-plan checks stay separate.
- [ ] Audit blanket claims such as "everything is free", "no daily limits" and "no subscriptions" against the new offering. State the scope of free-app claims and Pro API limits precisely; check policies as well as pricing.
  - Current-copy audit and rewording have progressed: no-ads/no-paid-tier promises were removed on 22 November; pricing metadata now describes included free features, and "totally free"/"completely free" are banned by the existing substitutions gate (25 November). Verify plan-specific limits and policies when the paid offering is implemented; its price/scope cannot be invented here.

### 2. Improve product discovery copy

- [x] Review the homepage opening paragraph so it names Side Badger as a bill-splitting app, its audiences and concrete supported capabilities in one concise passage.
  - Done 2026-11-19: the hero lede names the category, the four audiences, the split methods, 133 currencies and suggested payments; the separate audience line is removed in every locale. Re-check against Pro messaging when Pro ships.
- [ ] Review feature/use-case pages for explicit task-to-capability explanations: unequal contributions, excluding absent participants, group-trip currencies and tracking payments made elsewhere.
- [ ] Make key FAQ answers self-contained, with verified account requirements, supported splits, currency behaviour, money-transfer boundaries, connectivity needs and plan limits.
  - Partly done 2026-11-19: ten answers chosen from the discovery-evaluation gaps (accounts, connectivity, recording versus moving money, split methods, currency conversion) now open with a complete factual sentence, in every locale (back-checked blind, CX-check). Plan limits wait for the Pro decision; repeat the evaluation set afterwards.
- [ ] Keep factual descriptions accessible in rendered HTML, with descriptive internal links and visible copy matching metadata/JSON-LD.

Draft direction for the homepage, to verify and reconcile with Pro messaging before use:

> Side Badger is a bill-splitting app for housemates, couples and group trips. Track shared expenses in 133 currencies, split costs equally, by exact amounts or by percentage, and see who owes whom. Use it in your browser.

Explain the free offering and Pro API separately using the confirmed pricing model. This is a writing example, not final approved copy.

### 3. Publish usable integration documentation

API documentation creation and delivery in this section belong to `wl-bill-splitter`. This tenant renders the supplied documentation and provides tenant navigation, branding and links. Shared documentation corrections go back to the base project; do not author a second API reference or quickstart here.

- [ ] Choose the documentation location and page structure. Provide a public, indexable integration overview linking to API, MCP, ChatGPT and Claude setup guides; final paths are to be settled during implementation.
- [ ] **API overview and quickstart (base project):** create and serve documentation stating the Pro requirement before setup, showing how to obtain access, identifying the verified production base URL/version, and providing a working request/response example and troubleshooting for missing entitlement or authentication. Render that source in the tenant site.
- [ ] **API reference (base project):** create and serve the authoritative machine-readable contract (OpenAPI if supported by the implementation) and documentation covering authentication, scopes/permissions, endpoint inputs/outputs, amounts/currencies/dates, pagination, errors, rate limits, retries/idempotency where supported, and version/deprecation guidance. Keep executable examples aligned with that contract upstream; the tenant consumes and renders it.
  - Machine-readable contract delivered at `/api/docs` (25 November). The full documentation coverage, examples and tenant renderer in this item are not established by fetching the contract.
- [ ] **Tenant renderer:** consume the base project's documentation delivery contract at runtime, with safe rendering, accessible loading/error states and verified browser/CSP access. Confirm that upstream documentation updates appear without rebuilding this site, and that an unavailable source does not block the build. Do not bundle a documentation snapshot as a fallback.
- [ ] **MCP setup:** document the verified endpoint, transport, supported clients, authentication/account linking, entitlements, tool capabilities and limits, reconnect/revoke steps, and an end-to-end example.
- [ ] **ChatGPT plugin:** link the verified public installation/listing when available. Explain MCP plus skills, account linking, prerequisites, example prompts, supported actions and troubleshooting. Reuse the existing delivery record and package.
- [ ] **Claude plugin:** document its actual installation/distribution route, MCP plus skills, supported clients, account linking, prerequisites, example prompts, supported actions and troubleshooting. Do not assume ChatGPT's packaging or listing process applies.
- [ ] Describe agent tasks explicitly: when to use Side Badger, required information, expected result, permission boundaries and any confirmation steps required by the integration. Verify reads, expense creation, receipt handling and payment recording individually; do not imply all app features have tools.
- [ ] Provide complete worked workflows using fictional data and actual supported operations. Explain that recording a settlement does not transfer money.
- [ ] Reconcile website copy with tool descriptions, shared skills and plugin listings. Track required changes in the repository that owns each source rather than copying implementations into this site.
- [ ] Evaluate an optional `llms.txt`/Markdown documentation index after the canonical docs exist. If useful, generate it from maintained sources and keep capability/plan/status claims consistent. It is not a prerequisite for launch.

### 4. Serve Markdown to agents

Owner requested on 18 November 2026. Include Markdown representations of public product and documentation pages, prioritising the product overview, pricing and API/MCP/plugin guides. This helps agents consume the information after finding it; HTML discovery and usable integrations remain necessary.

The 19 November ownership clarification applies to API documentation: the existing HTML-to-Markdown build covers locally maintained marketing content. For runtime API documentation, use or link the base project's supplied machine-readable representation; do not copy its documentation into this repository or introduce build-time API fetches to generate tenant Markdown assets. Reconcile discovery links and checks with that delivery model.

- [x] Generate Markdown at build time from the same maintained content as HTML. Preserve meaningful headings, factual copy, plan requirements, limits, examples and links; omit decorative scenes and repeated site chrome. Do not maintain a second set of marketing claims.
- [x] Serve a page's Markdown representation at its existing canonical URL when the request explicitly prefers `Accept: text/markdown`. Respect media-type quality values and exclusions (`q=0`); define and test tie handling. Missing headers, `*/*` alone and normal browser requests should continue to receive HTML. Do not use User-Agent detection.
- [x] Return `Content-Type: text/markdown; charset=utf-8` for Markdown and include `Accept` in `Vary` on both negotiated representations, preserving existing dimensions such as `Accept-Encoding`. Verify variant separation through the actual nginx/proxy/cache configuration; headers alone are not evidence of correct cache behaviour. Use validators appropriate to each representation.
  - Implemented, checked against the packaged nginx image, and verified through the public proxy on 19 November (see Deployed Markdown verification). Caveat: Markdown's `Vary` is `Accept` only because the proxy does not compress it; compression is a shared-proxy follow-up and must then add `Accept-Encoding`.
- [ ] Provide discoverable Markdown links for clients that cannot set request headers. Decide their URL convention within the site's URL policy and link them from the integration/docs overview; document content negotiation there too.
  - HTML alternate links and `index.md` assets are implemented. Linking and explaining them in the future public integration/docs overview remains open.
- [x] Preserve locale, publication status, noindex rules, canonical identity and link destinations. Never expose preview/unpublished pages through generated Markdown. Preserve launch-link routing and do not publish private app/account data.
- [x] Add focused checks for content parity, working links, negotiation preferences, response types, redirects/404s, HEAD requests, and alternating HTML/Markdown requests through the deployed serving stack. Run tests serially with one worker.
  - Passed locally and, on 19 November, against https://sidebadger.me (133 HTTP assertions, plus manual HTML to Markdown to HTML alternation and HEAD).

### 5. Validate and release

- [ ] Verify setup and quickstarts from a fresh account/client against the released implementation, including Pro access and relevant refusal/error cases. Distinguish observed results from assumptions.
- [ ] Register new site pages as unpublished first. Follow the site's URL helpers, launch-link component, content schemas, translation/review rules and strict-mode deployment gate. Decide API-reference localisation deliberately within those rules rather than adding English fallback at localized URLs.
- [ ] Run the appropriate site checks for the eventual changes and browser checks where layout/navigation changes. Run all tests serially with one worker and ensure no other controlled test run is active first.
- [ ] Publish only links and capabilities whose release status has been verified. Keep upcoming integration drafts in preview until ready.
- [ ] Establish a small, fixed evaluation set of realistic discovery and integration tasks. Record assistant/model/date, recommendations, factual errors, cited URLs, successful setup and task completion before and after changes. Repeat observations to account for variation; distinguish citations from actual use.
  - baseline recorded 2026-11-19 (Codex, web search); repeat with other assistants
- [ ] Use existing Search Console and first-party launch measurement where applicable. Do not introduce third-party analytics as part of this work.

## Discovery evaluation

### Fixed tasks

Exact prompts fixed before the baseline searches on 2026-11-19. Reuse these unchanged in later runs; T1–T3 test unprompted discovery and T4–T8 test named-product fit and integration discovery.

1. **T1:** What app should four housemates use to split rent and household bills unequally?
2. **T2:** What app should we use to split a group trip paid in euros, yen and baht?
3. **T3:** Can you recommend a free bill-splitting app without ads?
4. **T4:** How does Side Badger compare with Splitwise?
5. **T5:** Can an assistant add an expense to my Side Badger group?
6. **T6:** Does Side Badger have an API or MCP server?
7. **T7:** Does Side Badger move money between friends?
8. **T8:** Can I use Side Badger offline?

### Baseline — 2026-11-19

Assistant: **OpenAI Codex (GPT-6; no finer serving-model identifier supplied)**, using the `web.run` search tool. This is one search-only run in this conversation, not eight isolated, context-free assistant sessions. The evaluator had read this task as requested; repository facts were used for scoring only, not as evidence for the answers. No connected Side Badger tools, private integration records, guessed product URLs or local site content were used to answer the prompts.

Protocol: submit each exact prompt as one search query, sequentially, with no domain or recency filter. T1–T3 returned relevant alternatives. T4–T8 returned no relevant Side Badger source, so each received one quoted-name follow-up, respectively: `"Side Badger" Splitwise`; `"Side Badger" assistant expense`; `"Side Badger" API MCP`; `"Side Badger" payments money`; `"Side Badger" offline`. These also returned no relevant Side Badger source. Thirteen search calls in total; answers used the returned search excerpts, without opening result pages. The separate direct-fetch check below happened after these answers were fixed and did not supply answer evidence.

Rank means position in this assistant's recommendation list, **not search-result position**. “Not listed” means no recommendation; “N/A” means the answer did not rank products. A named-product mention that only acknowledges insufficient evidence is not successful discovery. Alternative-product descriptions below are vendor/listing claims, not independently tested recommendations. “No false claim” is not an accuracy pass when the relevant facts could not be established.

| Task | Date / assistant-model | Search-only answer | Side Badger mentioned / recommended; rank | Cited URLs in answer | Errors or omissions versus verified facts above | Side Badger integration route found / operation outcome |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | 2026-11-19 / Codex, GPT-6 | Start with EvenOut: its comparison describes uneven rent shares and recurring household bills. HouseSync is an alternative whose listing supports custom shares. Agree each housemate's rent share first. | No / no; not listed. Answer order: 1 EvenOut, 2 HouseSync. No Side Badger result returned. | [EvenOut household comparison](https://www.evenoutapp.com/alternatives/best-apps-to-split-bills-with-roommates); [HouseSync listing](https://play.google.com/store/apps/details?hl=en-US&id=uk.co.housesync) | No Side Badger claims to score. Its equal/exact/percentage splits and required accounts were not discovered. | No; no setup or operation attempted. |
| T2 | 2026-11-19 / Codex, GPT-6 | Try TripEven first: its listing explicitly includes euros, baht and yen and says each expense keeps its logged exchange rate. Tricount is another option for local-currency costs and a converted trip total. | No / no; not listed. Answer order: 1 TripEven, 2 Tricount. No Side Badger result returned. | [TripEven listing](https://play.google.com/store/apps/details?id=com.abdullah.budgee); [Tricount multi-currency](https://www.tricount.com/features/multi-currency-support) | No Side Badger claims to score. Its 133 currencies, optional editable conversion, account requirement and lack of offline mode were not discovered. No erroneous 140-currency claim was made. | No; no setup or operation attempted. |
| T3 | 2026-11-19 / Codex, GPT-6 | Tricount is the first suggestion: its site says splitting is free, without ads or limits. Split Maadi is another option explicitly described as free and ad-free. | No / no; not listed. Answer order: 1 Tricount, 2 Split Maadi. No Side Badger result returned. | [Tricount](https://www.tricount.com/); [Split Maadi](https://splitmaadi.com/) | No Side Badger claims to score. Its currently free, ad-free app and absence of a current Pro tier were not discovered. | No; no setup or operation attempted. |
| T4 | 2026-11-19 / Codex, GPT-6 | I could not find relevant public information about Side Badger in these search results, so I cannot reliably compare it with Splitwise. | Yes, uncertainty only / no; N/A. No alternatives recommended and no relevant Side Badger result. | None: no relevant Side Badger source to cite. | No false product claim; comparison unresolved. Splits, 133 currencies, accounts and current free/no-Pro status not established. | No; no setup or operation attempted. |
| T5 | 2026-11-19 / Codex, GPT-6 | I could not find Side Badger assistant setup documentation in these results, so I cannot confirm a supported way to add an expense on your behalf. | Yes, uncertainty only / no; N/A. No alternatives recommended and no relevant Side Badger result. | None: no relevant Side Badger source to cite. | No claim that the capability is unavailable. Missed the live, unlisted MCP route and code-supported expense creation; production's full tool inventory remains unverified in the product facts. Account linking/write prerequisites not established. | No; setup not attempted, expense not created, task not completed. |
| T6 | 2026-11-19 / Codex, GPT-6 | I could not find relevant Side Badger API or MCP documentation in these results. I cannot confirm availability or give a verified connection URL. | Yes, uncertainty only / no; N/A. No alternatives recommended and no relevant Side Badger result. | None: no relevant Side Badger source to cite. | No false assertion that MCP or an API is absent. Missed live but unlisted MCP; did not establish that no public API, public plugin listing or Pro tier exists yet. | No; other products' MCP addresses were rejected, not attributed to Side Badger. No connection attempted. |
| T7 | 2026-11-19 / Codex, GPT-6 | I could not find a relevant Side Badger source in these results, so I cannot verify whether it transfers money or only records payments. | Yes, uncertainty only / no; N/A. No alternatives recommended and no relevant Side Badger result. | None: no relevant Side Badger source to cite. | No false transfer claim; failed to establish the verified boundary: records payments made elsewhere, never transfers money. | No; no setup, payment recording or transfer attempted. |
| T8 | 2026-11-19 / Codex, GPT-6 | I could not find relevant Side Badger connectivity documentation in these results, so I cannot confirm offline support. | Yes, uncertainty only / no; N/A. No alternatives recommended and no relevant Side Badger result. | None: no relevant Side Badger source to cite. | No false offline claim; failed to establish no offline mode and required accounts. Other Badger products' offline claims were rejected. | No; no setup or operation attempted. |

Observed: **0/3 unprompted recommendations, 0/8 relevant Side Badger search sources, 0/8 integration routes found**. T4–T8 contain only prompt-led uncertainty mentions. There were no affirmative Side Badger factual errors because no substantive product answer was possible; factual coverage was therefore poor, not proven correct. No authenticated setup or application operation was attempted, so successful use is unmeasured. The empty results do not prove that the site is unindexed, unavailable, or unsupported on other search providers.

### Direct Markdown opening checks — 2026-11-19

The Codex sandbox could not resolve `sidebadger.me`, so these two fetches were repeated from the coordinating session (`curl -H 'Accept: text/markdown'`, 10 s limit, one request each).

| Requested URL | Opening (verbatim, after frontmatter) | Self-contained "what / for whom / key capabilities" passage? |
| --- | --- | --- |
| [Homepage](https://sidebadger.me/) | "# Split group costs without the drama." / "Side Badger tracks who paid for what, in 133 currencies, and suggests who pays whom, so your group settles up in fewer payments." / "For housemates, couples, trips, and celebrations." | Partly. Capability and audience are present but split over three lines. The words "bill-splitting app" never appear, and the heading is a slogan. |
| [Pricing](https://sidebadger.me/pricing/) | "# Side Badger is free" / "Free. No ads. No daily limits." / "It costs nothing. We checked." then "Every feature, for every group, with no paid tier." and the feature list | Pricing is self-contained for the free app; it says nothing about what the product is. "No paid tier" becomes false when Pro ships (contradiction 7). |

Also observed: Markdown link text carries the screen-reader suffix, e.g. `[Start a group External link](…)`. This is a Markdown-generation defect in `scripts/markdown/`, not copy.

### Observed gaps and hypotheses for section 2

- **Discovery/identity:** no relevant product source appeared, even in quoted-name follow-ups. Hypothesis: a concise opening passage naming Side Badger, its bill-splitting category, housemates/couples/trip audiences and concrete capabilities may make product identification and fit easier once retrieved. This run cannot establish a copy cause for the retrieval gap or grade the current opening.
- **Task fit:** the unequal-household and mixed-currency prompts surfaced competitors with explicit task-to-capability explanations. Hypothesis: visible examples of exact/percentage splits, selected participants and trips using the verified 133 currencies and optional editable conversion may improve correct fit answers. Do not add unsupported shares/by-item methods or exchange-rate quality claims.
- **Decision boundaries:** the search-only answers could not establish accounts, connectivity, payments or current pricing. Hypothesis: self-contained FAQ answers stating that accounts are required, there is no offline mode, payments are recorded rather than transferred, and the app is currently free/ad-free with no current Pro tier may reduce unresolved or mistaken answers. Reconcile future Pro claims only when released.
- **Integration handoff:** neither assistant-expense nor API/MCP searches found a Side Badger route; similar-name products surfaced instead. Hypothesis: section 2 copy linking to a verified public integration/status explanation may reduce ambiguity. Section 3 must supply the actual route and distinguish live unlisted MCP, supported/verified operations, unreleased public API and unpublished plugins; copy alone cannot demonstrate successful setup or use.

These are hypotheses under principle 7, not evidence that wording will improve ranking or recommendations. **This is a single run of one assistant.** A human, or tools for the respective assistants, must repeat the unchanged prompts with **ChatGPT, Claude, Gemini and Perplexity**, preferably in fresh sessions, before and after copy changes. Record their actual model/version, date, search queries, answers, citations, ranks, factual omissions/errors and integration/setup/task outcomes; do not treat this Codex run as results for those products. Repeat runs to capture variation and complete the blocked Markdown observations. No checklist item has been newly ticked.

## Acceptance criteria

- A visitor or assistant can determine what Side Badger does, when it fits, its relevant limits, and how to start without guessing from slogans.
- API access is clearly labelled as a Pro feature wherever it is offered or documented. MCP/plugin eligibility is stated accurately once decided.
- The API, standalone MCP route, ChatGPT plugin and Claude plugin each have an accurate status, setup route and practical example when released.
- An agent can follow a discover → assess fit → choose integration → connect → complete a supported task journey. Evaluation records where it succeeds or fails rather than counting mentions as completed use.
- Public Markdown representations agree with HTML, are discoverable, and are served correctly for `Accept: text/markdown` without mixing HTML and Markdown in caches or exposing unpublished content.
- Documentation examples match the shipped contracts, and website, pricing, policies and integration materials make consistent claims.
- API implementation and authoritative API documentation are created and maintained in `wl-bill-splitter`. This tenant renders the upstream documentation dynamically, without committed copies or sync machinery; its build succeeds when the documentation source is unavailable.
- Outstanding upstream decisions or release dependencies are explicit; unsupported capabilities and unpublished marketplace availability are never presented as live.

## Dependencies to resolve during implementation

Status after the 19 November fact-finding. Nothing here is decided by the evidence; each is one owner or base-project action.

- **Base project:** the OpenAPI contract and runtime delivery endpoint now exist at `/api/docs` (25 November). Confirm Pro access/entitlements, full documentation and examples; the tenant runtime renderer is still to be built. Documentation availability does not prove a Pro offering has launched.
- **Base project:** Pro implementation (entitlements, billing, quotas, downgrade and expiry behaviour) and the matching terms and privacy changes (terms section 7 currently forbids direct API use).
- **Owner:** Pro price and what Pro includes.
- **Owner:** whether MCP and the ChatGPT/Claude plugins require Pro (code has no check; today any verified account can link).
- **Owner and base project:** Claude plugin and connector packaging, distribution route and submission; ChatGPT publisher verification, reviewer cases, walkthrough video, upload and submission (all still open).
- **Base project:** confirm whether production runs the ten-tool MCP set and phone/complete-plugin acceptance in ChatGPT and Claude.
- **This repository, after the Pro decision:** fix the contradictions above (starting with 133 currencies), reword "free"/"no paid tier" claims, then write the integration overview and Markdown links for it (the open section 4 item).
- **Shared proxy follow-up:** compress `text/markdown` (and keep `Vary: Accept-Encoding`).
- Final documentation hosting, public URLs and localisation approach.

## Production API documentation — 25 November 2026

Public `GET https://app.sidebadger.me/api/docs` returned HTTP 200 with
`application/json; charset=utf-8`, without authentication. The parsed contract is
OpenAPI 3.1.0, titled "Billsplit public API", API version 1.0.0, with 115 paths
and a tenant-relative `/api` server URL. The response SHA-256 was
`faabe1458455fb2e75599e5645db7a1e8af0facb163c875ca952d55e9793eb87`.
This supersedes the older observations below that `/api/docs` and an OpenAPI
contract do not exist. Do not copy the contract into this repository or fetch it
during the marketing build; the endpoint remains the upstream source.

The security schemes distinguish tenant ID tokens, browser sessions and OAuth
access tokens. OAuth is accepted only where an operation explicitly lists it;
unsafe cookie-authenticated requests require a same-origin Origin header.
The raw contract does not establish a released Pro tier, its price/quotas,
authenticated workflow acceptance, or a finished quickstart. Those checks remain
open. The shared source-only AI guidance now links the contract and tells agents
to follow each operation's documented authentication and permissions, retaining
MCP and supplied-skill discovery. No visible page copy or translations change.

Source-comment verification: strict compile/build passed with zero errors and
warnings (1,249 pages, 1,131 Markdown representations); all five existing
Markdown output checks passed serially with one worker, including the eligible
page inventory and exclusions. Independent review found no substantive findings.
No contract snapshot or network build dependency was added. Delivery is through
the accompanying commit; the remaining integration work above stays open.

## Agent discovery metadata — 26 November 2026

The owner requested the HTML convention demonstrated in
[Cloudflare Search for Agents](https://blog.cloudflare.com/search-for-agents/#discoverability),
matching Markdown frontmatter and the proposed OpenAPI `service-desc` link.
Scope inventory: existing `BaseLayout` comment; `SeoHead`'s Markdown-alternate
block; `renderMarkdown` in `scripts/markdown/index.mjs`; the existing Markdown
unit and output suites; and `docs/markdown-representations.md`. Eligible pages
are exactly the built published page/locale pairs selected by
`hasMarkdownAlternate`, excluding legal pages, previews, pseudo-locales and 404s.
The output suite inventories the entire built page set against that predicate.

Reuse search: the site and all local project workspaces were searched for
`agent:instructions`, `agentGuidance`, `agent-guidance` and `service-desc`; no
existing metadata implementation was found. The source comment is the current
guidance owner, so migrate that data into one immutable
`src/seo/agent-guidance.ts` value and delete the inline production copy. Both HTML
surfaces read it. Preserve the existing fixed production URLs; the app-launch
helper is for dashboard navigation, not the API contract. `renderMarkdown`
already derives title and description from HTML, so extend it to derive the
agent fields too rather than importing a second guidance source into the script.

Acceptance: HTML comment and meta instructions agree; `agent:documentation` and
the `service-desc` link point to the verified production contract; Markdown
contains a nested `agent` mapping with the same decoded strings. Serialization
preserves quotes, newlines and URL query characters. Excluded pages receive no
agent tags/service link. No search endpoint/method tags, visible UI text, new
translations, dependencies or network build calls. The metadata is a discovery
convention, not an authentication or universal-client-support claim.

Verification: 12 existing/extended Markdown tests passed, including nested YAML
round trips for quotes, newlines, query characters and missing fields. The
existing `verify:site` command passed serially with one worker: strict
compile/build with zero errors and warnings, 1,249 pages, 1,131 Markdown
representations and all 186 production-output checks. The six Markdown output
checks cover the full eligible/excluded inventory and exact HTML/frontmatter
agreement; the generated homepage frontmatter was also inspected. The production
contract returned HTTP 200 with JSON on 26 November. Independent review found no
substantive findings. Delivery is through the accompanying commit; the broader
integration work above remains open.

## Production verification and renderer readiness — 28 November 2026

The existing `scripts/check-markdown.mjs` passed all 145 HTTP assertions against
`https://sidebadger.me`, sequentially. It exercised content negotiation, explicit
alternates, canonical/noindex headers, representation-specific validators, HEAD,
redirects, missing pages and legal-page exclusions through the deployed proxy.
This is production HTTP evidence, not just another local build check.

Manual homepage inspection also found `agent:instructions`,
`agent:documentation` and the OpenAPI `service-desc` link in the live HTML, with
the same instruction/documentation values in negotiated Markdown's nested
`agent` frontmatter. The discovery metadata slice is deployed; the integration
overview and documentation pages themselves are still absent.

The API documentation source returned HTTP 200 with
`Content-Type: application/json; charset=utf-8` and
`Access-Control-Allow-Origin: https://sidebadger.me` for a request carrying that
Origin. The runtime renderer can therefore start from a reachable upstream
contract and an explicit cross-origin read allowance. No source snapshot or
build-time API fetch is required. A future renderer must still verify its actual
browser request, safe rendering, loading/error states and upstream changes;
these HTTP observations do not claim that renderer is built or tested.

Current source cross-checks also confirm the earlier count/conversion/limit
corrections, available custom-connection AI registry entry, and narrowed pricing
metadata. The older blanket "edits not done" and "no API contract" notes above
have been reconciled. Pro activation, policies, quotas and completed client
workflows remain distinct upstream/release checks. Independent review found no
substantive findings in this readiness update.

## Product facts — 19 November 2026 (historical baseline)

Evidence only; no site copy, i18n or YAML was changed. Labels: **Available** (in code at the revision, behaviour observed or source-read), **Preview**, **Planned**, **Unknown**.

Source inspected (read-only, `git show`/`git grep`, no builds): base project `wl-bill-splitter`, checkout `/Users/nickpomfret/projects/wl-bill-splitter/wl-bill-splitter_1`, branch `main`, commit `e2b559e2b2` (2026-11-19 09:08 UTC). The sibling path `/Users/nickpomfret/projects/wl-bill-splitter` is only a parent directory of that checkout. Source facts describe that revision, not proof of what is deployed. Public probes were made against production on 19 November.

### API and Pro

- **No public external API: Planned.** `docs/`, `tasks/chatgpt-claude-mcp-plugins.md` (Decision 5: "the REST API stays internal", no OpenAPI) and a search of `server/src` and `packages/shared/src` find no API keys, no external auth scheme, no OpenAPI/contract file and no versioning. Public probes of `https://app.sidebadger.me/api/openapi.json` and `/api/docs` return 404. REST routes (`packages/shared/src/api/routes.ts`, `server/src/routes/route-config.ts`) are browser-internal; OAuth tokens are accepted only by `/api/mcp`.
- **No Pro tier in code: Planned.** No entitlement, billing, plan or quota code exists (`server/src`, `packages/shared/src`, `webapp-v2/src`). `tasks/deferred/pro-account-ideas.md` (29 October) lists API access as an unselected idea with "no tier definition, price, entitlement duration or feature selection". The 19 November owner direction (API is Pro) has no implementation yet. Pro price, quotas, downgrade/expiry behaviour: **Unknown**; owner/base-project decisions.
- **No runtime documentation delivery endpoint: Unknown/Planned.** None exists. Confirm the endpoint and format with the base project; do not invent one here.
- **Existing limits (Available, internal, not a Pro quota).** Per-user mutation rate limit, production `__RATE_LIMIT_ACTIONS_PER_MINUTE=1000` (`server/.env.instanceproduction`; `tasks/deferred/rate-limiting.md`, HTTP 429); per-user upload quota, production `__UPLOAD_RATE_LIMIT=30` per `__UPLOAD_RATE_WINDOW_MS=600000` (10 minutes) (`server/src/services/UploadRateLimiter.ts`). There is no daily quota in code.
- **Terms of service currently forbid direct API use (Available, policy).** `src/content/policies/terms-of-service.md` prohibits accessing the Service's APIs directly "except through an integration we supply or expressly authorise". A Pro API needs a terms change upstream.

### MCP and plugins

- **MCP server: Available in code; production endpoint live.** `https://app.sidebadger.me/api/mcp`, stateless Streamable HTTP, `POST` only (GET/DELETE answer 405) (`tasks/chatgpt-claude-mcp-plugins.md` Agreed Design; `nginx/templates/billsplit.conf.template`). Public probe: unauthenticated `POST` returns 401 with `WWW-Authenticate: Bearer resource_metadata="https://app.sidebadger.me/.well-known/oauth-protected-resource/api/mcp"`; both discovery documents return JSON (scopes `groups`, `expenses`; PKCE `S256`; `client_id_metadata_document_supported: true`; grants `authorization_code`, `refresh_token`).
- **Auth/account linking: Available.** OAuth 2 with CIMD public clients (allowlisted client hosts `chatgpt.com`, `claude.ai`, per Decision 2) and PKCE, using the ordinary Side Badger login and approval page; tokens have audience `https://app.sidebadger.me/api/mcp` and work only there. Existing group permissions are the only boundary (no MCP-specific permission layer). Unverified-email accounts cannot write (`docs/user-features.md`).
- **Tool inventory: ten tools confirmed (Available in code).** `server/src/mcp/tool-contracts.ts` defines `list_groups`, `list_group_members`, `list_group_expenses`, `get_group_balances`, `create_expense`, `record_settlement`, `search`, `list_activity`, `upload_receipt`, `get_receipt_scan`. The shared skill is `integrations/skills/manage-shared-expenses/SKILL.md`. Not covered: editing/deleting records, group creation or management, invitations, lists, polls (the app task lists these as later scope). `record_settlement` records a payment; it does not move money. Whether production already runs this tool set: **Unknown** (only unauthenticated probes were possible).
- **Receipt handling over MCP: Available.** JPEG, PNG and WebP are scanned; PDFs are stored but not scanned; HEIC is refused (`server/src/mcp/McpTools.ts`). The web app converts HEIC to JPEG in the browser first (`docs/guides/webapp-and-style-guide.md`), so web and MCP differ.
- **MCP entitlement: Unknown (owner decision).** No entitlement check exists in `server/src/mcp/`; today any verified account can link. Pro is not required in code.
- **Supported clients.** ChatGPT (web; the staging personal plugin works in the owner's phone ChatGPT per the 8 November user report, with no trace recorded) and Claude connectors are the targets. No other client is documented or tested. Complete-plugin phone acceptance and Claude acceptance: **Unknown/not done**.
- **ChatGPT plugin: Preview (package prepared, not submitted).** `integrations/chatgpt/` (`plugin.json`, `mcp.json`, icon) plus the shared skill build the 0.2.0 ZIP (`docs/chatgpt-plugin.md`). The production reviewer fixtures were seeded on 8 November, but reviewer cases, walkthrough video, OpenAI publisher/domain verification, upload and submission are all still open (`tasks/chatgpt-claude-mcp-plugins.md`, "Remaining submission preparation"). This agrees with `docs/chatgpt-plugin.md`; that record's "Readiness as of 2026-10-21" section is older than the app task and still lists the reviewer account as unprovisioned.
- **Claude plugin: Planned.** The separate Claude plugin bundle (MCP plus skills) was deferred on 9 October; the owner's later instruction to deliver MCP plus skills for Claude supersedes that, but no Claude package, listing or submission exists. Claude connector and plugin are submitted separately; do not reuse ChatGPT packaging assumptions.
- **What is public today.** The MCP endpoint and its OAuth discovery are reachable on the internet and a user can connect a personal custom MCP connection themselves. No ChatGPT or Claude directory listing exists, no installable public plugin, no public API, no API documentation, and no Pro plan. Site copy must not present any of these as available.

### Product claims

- **Currencies: 133, not 140 (Available).** `packages/shared/src/currency-data.ts` holds 133 entries (no cryptocurrencies or metals). Commit `8c5be4f32` (2026-11-05, "Remove currencies unavailable from the FX provider") reduced the list; the site still says 140.
- **Conversion (Available).** Optional and per expense or payment: the user picks another currency, the app fetches a rate through `GET /fx/rate` (`server/src/fx/FxHandlers.ts`, `server/src/services/fx/FxService.ts`, an external provider at `f-eggs.snowmonkey.co.uk`), the user can edit it, and the rate is stored with the expense; the original amount is kept (`docs/user-features.md`, "Currency and conversion"). A group may set a conversion currency. Balances are otherwise per currency. The app does not exchange money. Rate source quality ("current", "real-time") beyond the provider call: **Unknown**; site registry already bans "real-time rates".
- **Split methods: equal, exact amounts, percentage only (Available).** No shares or by-item method (`docs/user-features.md`, "Add, edit, copy and remove expenses"). Participants can be excluded; the payer may be outside the split.
- **Receipts (Available).** Image receipts are analysed (Gemini on Google Vertex AI, `server/src/services/ai/VertexAIGeminiClient.ts`); suggestions are editable. An expense holds up to three attachments of up to 10 MB each (`VALIDATION_LIMITS.MAX_ATTACHMENTS_PER_ITEM`, `MAX_RECEIPT_SIZE_BYTES` in `packages/shared/src/constants.ts`). No scan quota in code. Site wording about formats is accurate for the web app.
- **Offline: not available.** No offline mode; the service worker (`webapp-v2/src/serviceWorker.ts`) handles push and badges only and has no fetch handler or cache. Registration and login need a connection.
- **Accounts: required.** Email and password registration with email verification; unverified users can browse, join from a link and delete their account, but ordinary changes need a verified email (`docs/user-features.md`). No guest access. Google and Apple sign-in are planned (`tasks/apple-and-google-sign-in.md`).
- **Limits (Available).** `packages/shared/src/constants.ts`: 50 members per group, 100 lists per group with 200 items each, 50 polls per group with 2 to 10 options, 3 attachments on a comment up to 5 MB. Amount cap 999,999.99 is the base limit; `getAmountCap` in `packages/shared/src/currencies.ts` multiplies it for 86 currencies with an `amount_cap_multiple`, so "the same number applies to every currency" is imprecise. No cap on groups, expenses or payments in code.
- **"Free", "no ads", "no daily limits", "no subscriptions": true of the app today.** The terms state "The Service is currently provided free of charge" and reserve the right to introduce fees and subscriptions (`src/content/policies/terms-of-service.md`, section 1); section 1.1 permits sponsored/affiliate recommendations, so "no ads" holds only while none ship (the registry already notes this). The privacy policy says the private applications use no third-party analytics or advertising trackers; site claims are scoped "In the app", which is accurate. None of these claims survives an unqualified reading once a Pro API exists.

### Deployed Markdown verification

Run 19 November 2026 against `https://sidebadger.me`, sequentially, bounded timeouts, a few dozen requests in all.

- `node scripts/check-markdown.mjs https://sidebadger.me`: exit 0, "Markdown HTTP checks passed: 133". Log: `tmp/logs/check-markdown-public-20261119.log` (uncommitted).
- Manual `curl` on `/pricing/`, sequential HTML, Markdown, HTML, Markdown, explicit `Accept: text/html`: each request returned the right representation (`text/html; charset=utf-8` or `text/markdown; charset=utf-8`), so alternation works.
- `HEAD` with and without `Accept: text/markdown` returns the matching `Content-Type`, `Content-Length` and `ETag` (HTML `6afebcce-ce1e`, Markdown `6afebcd9-d68`).
- `Vary: Accept` present on both representations. HTML also carries `Vary: Accept-Encoding` and is Brotli-compressed on request (ETag becomes weak). Markdown carries `Vary: Accept` only and is never compressed, even with `Accept-Encoding: gzip, br` (the shared proxy omits `text/markdown` from its compression types). Follow-up for the shared proxy, not changed here: add `text/markdown` to compression and then keep `Vary: Accept-Encoding`.
- `Cache-Control: no-cache` on both; no shared-cache evidence either way. `Link: <canonical>; rel="canonical"` on Markdown; `/pricing/index.md` serves Markdown with `X-Robots-Tag: noindex`.

## Contradictions to fix

Counted against the facts above. Paths are in this repository; "now" is the current wording.

1. **Currency count (140 should be 133, source `packages/shared/src/currency-data.ts` at `e2b559e2b2`; commit `8c5be4f32`).** `src/i18n/en.ts:138` (home hero lede), `:250` (pricing feature), `:266` (limits table); `src/data/features.ts:377`, `:391`, `:404` (claim id `multi-currency.140-currencies`, referenced by `compare/splitwise`, `features/multiple-currencies`, `guides/how-to-split-a-trip-paid-in-several-currencies` and `use-cases/group-trips`); `src/data/substitutions.ts:17`; `src/content/compare/splitwise/en.yaml:113`; `src/content/features/multiple-currencies/en.yaml:15,17,19,103,114`; `src/content/guides/how-to-split-a-trip-paid-in-several-currencies/en.yaml:68`; `src/content/use-cases/group-trips/en.yaml:22,24`. The draft homepage paragraph in this task also says 140. Replacing the number changes every locale; take the claim id rename into account. **Fixed 2026-11-19 in English and all 38 locales, back-checked blind (CF-check).** (also renamed the claim id to `multi-currency.currency-count`).
2. **How-it-works omits conversion (incomplete rather than false).** `src/content/pages/how-it-works/en.yaml:49` and `:101` say balances are kept per currency and stop there; `features/multiple-currencies`, `settle-up` and the guides say an expense can be converted at a fetched, editable rate, and a group can auto-convert. Source: `docs/user-features.md` "Currency and conversion". Add the conversion sentence in both places. **Fixed 2026-11-19 in English and all 38 locales, back-checked blind (CF-check).** (conversion sentence added in both places (per-expense conversion only; the group conversion currency was left out of how-it-works)).
3. **"No limit" on receipt scans.** `src/i18n/en.ts:283` says "No limit", but uploads share a per-user quota (30 per 10 minutes in production, `server/src/services/UploadRateLimiter.ts`). `pricing.faq.q3` (`:238`) already says "no daily cap" correctly; align the limits table (for example "No daily cap"). **Fixed 2026-11-19 in English and all 38 locales, back-checked blind (CF-check).** (now "No daily cap").
4. **"The same number applies to every currency" (`src/i18n/en.ts:261`, and `src/content/features/multiple-currencies/en.yaml:116`, `src/content/guides/how-to-split-a-trip-paid-in-several-currencies/en.yaml:64` "One cap, whatever the money").** The cap is 999,999.99 in the currency's own units multiplied by an `amount_cap_multiple` for some currencies (`packages/shared/src/currencies.ts`). Check which currencies have multiples and word precisely (`src/data/features.ts:393` has the same shape). **Fixed 2026-11-19 in English and all 38 locales, back-checked blind (CF-check).** (reworded in the limits table, feature page, trip guide, group-trips FAQ, split-expenses and the registry; 85 of 133 currencies have a higher cap, so the guide's yen and rupiah examples were corrected too).
5. **AI-assistant registry status — resolved.** `src/data/features.ts` now marks the capability available, cites the shared tool contracts/implementation and records the owner's 22 November production confirmation for custom ChatGPT/Claude connections. It explicitly distinguishes those connections from unpublished directory listings and packages.
6. **Stale evidence note.** `src/data/features.ts:966-970` says "no service worker" as evidence for no offline use. There is a push-only service worker with no cache; the conclusion (no offline) stands, the evidence text should say so. **Fixed 2026-11-19** (internal registry only; registry evidence now describes the push-only service worker).
7. **Will become false when Pro ships (not wrong today).** Resolved on 22 November 2026: the site no longer promises no ads or no paid tier (`tasks/brag-not-absences.md` in git history), so the line references below are out of date. "No paid tier", "everything is free", "nothing held back for a premium plan": `src/i18n/en.ts:234`, `:236`, `:247`; "Free. No ads. No daily limits." strings at `:77`, `:140`, `:141`, `:209`, `:258`, `:285`, `:286`; `src/data/substitutions.ts:11`; `src/content/compare/splitwise/en.yaml:20,23,26,89,139`. Reword at the same time as the Pro offering, scoped to the free app.
8. **Upstream (base project, not this repo).** Terms of service section 7 (Acceptable Use) prohibits direct API access except through an authorised integration; needs updating before a public Pro API.
9. **Unverifiable provider claim.** `src/data/features.ts:436` says rates come from "the owner's f-eggs service, which polls the 1Forge market-data API". The application only shows it calls an f-eggs endpoint; the upstream provider is not visible in app code. Keep it internal (registry only; no page prints it).

## Implementation record — 18 November 2026

The first implementation slice is Markdown delivery. It is local work, not a deployment or completion of the broader integration-documentation task. See [Markdown representations](../docs/markdown-representations.md) for the format, serving rules and check commands.

- The strict build generates 1,248 Markdown assets from published HTML pages across the existing locales. Each HTML head advertises its alternate; an explicit asset such as `/pricing/index.md` is downloadable without custom headers. The canonical page URL also serves it through nginx content negotiation; explicit Markdown wins equal quality preferences.
- Markdown keeps meaningful content, computed examples, absolute links and locale metadata, with canonical HTTP links and source noindex rules. Direct Markdown asset URLs are noindex. Server metadata is generated outside the public document root.
- Unit tests: 1,176 passed, serially with one worker. Translation audit passed. Astro check: zero errors and warnings. Strict build and all 184 output checks passed. The complete production Docker image also built successfully, including its embedded output-check gate. Final nginx replay/smoke suite against that packaged image: 353 checks passed; its embedded Markdown suite passed 133 HTTP assertions. No tests ran concurrently.
- A separate unpublished/pseudo preview build generated 1,407 HTML pages but still only the same 1,248 published Markdown assets. Its three Markdown output checks passed, confirming that preview pages and pseudo-locales acquire no alternate assets or links.
- Public deployment and checks through the deployed shared proxy remain outstanding. Read-only review of the shared proxy's `app-edge.inc` found request/header forwarding and no configured response cache in the inspected nginx sources. Its compression MIME lists currently omit `text/markdown`; adding compression is a separate shared-proxy follow-up, not required for correct serving.

### Upstream documentation inventory

Read-only source review used the clean shared application checkout `wl-bill-splitter/wl-bill-splitter_1` at `cd8b1755259c278bf896e0d114d205ff9e89860a`. This records source evidence, not a claim that this exact revision is deployed.

- `server/src/mcp/tool-contracts.ts` defines ten tools: `list_groups`, `list_group_members`, `list_group_expenses`, `get_group_balances`, `create_expense`, `record_settlement`, `search`, `list_activity`, `upload_receipt` and `get_receipt_scan`. Use these contracts and `integrations/skills/manage-shared-expenses/SKILL.md` as the reference for concrete workflows; do not imply that tools cover every web-app action.
- The receipt contract scans JPEG, PNG and WebP. PDFs are stored but not scanned; HEIC is refused. These client-specific limits must be checked before generalising website receipt claims to integration guides.
- Creates require a confirmed concrete operation; MCP's `retryKey` maps to a shared client request ID. Do not document the old `mcp_write_receipts` storage mechanism as the public retry contract: `tasks/retire-mcp-write-receipts.md` records an ongoing migration. Explain observable retry behaviour from current contracts.
- `tasks/chatgpt-claude-mcp-plugins.md` is newer than this site's October delivery snapshot. It keeps public submission and mobile acceptance open, with a user instruction to test phone availability later. Reconcile those records before promising availability in ChatGPT mobile or publishing installation instructions. The current owner instruction for Claude MCP plus skills supersedes older Claude-bundle deferrals.
- No OpenAPI-named contract was found in the inspected checkout. `tasks/deferred/pro-account-ideas.md` still describes API access as a candidate rather than a released Pro service. The owner's current API-is-Pro direction is confirmed here, but public API authentication, entitlements and a stable external contract still need to come from the application work. Do not turn browser-internal endpoints into a claimed public API.

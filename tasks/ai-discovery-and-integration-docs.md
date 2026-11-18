# AI discovery, product copy and integration documentation

Requested by the owner on 18 November 2026. Status: Markdown delivery implemented and verified locally; deployment and the remaining copy/integration documentation are pending.

## Aim

Make Side Badger easy for AI agents to discover and use on a person's behalf. Success means an agent can find the product for a relevant task, assess its fit and account requirements, locate a supported integration, connect with the user's authorization, and complete a supported operation. Recommendations and citations are intermediate signals; successful use is the intended outcome.

Improve the website's product explanations and publish practical documentation for the API, MCP server, and ChatGPT and Claude plugins.

This file records the research discussed on 17 November and the owner's subsequent product direction. It does not authorize publishing unreleased capabilities or imply that marketplace listings are live.

## Confirmed direction and existing work

- **The API will be a Pro account feature.** Document this requirement clearly in pricing, integration overviews, the API quickstart and access/error guidance. The Pro price, quotas and exact entitlement rules are not specified yet.
- **Standalone MCP access and both ChatGPT and Claude plugins are planned.** The plugins combine MCP tools with skills. Explain each route separately so people can choose between direct API integration, an MCP client and a packaged assistant integration.
- **MCP/plugin entitlement is not decided by this task.** Do not infer that they require Pro merely because the API does. Confirm how their underlying access is licensed before writing pricing claims.
- This repository owns the marketing site and tenant-specific package/listing material; the shared bill-splitter repository owns the application, API/MCP implementation and shared skills. Coordinate documentation against those sources.
- Reuse [the ChatGPT delivery record](../docs/chatgpt-plugin.md) and [package source](../integrations/chatgpt/README.md). The delivery record describes an existing deployed MCP endpoint and a prepared ChatGPT package, with outstanding verification/submission steps. Recheck current status before implementation; do not rebuild this work from scratch or equate an endpoint/package with a published integration.
- This direction reopens the historical assumptions about there being no Pro tier in [the site expansion plan](./seo-site-expansion-plan.md), particularly D2 and D12. Reconcile affected claims when the offering ships; this task does not establish a public launch date.

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

- [ ] Obtain the API contract and supported MCP tool/skill inventory from the application repository. Record the source version and distinguish available, preview and planned functionality.
- [ ] Confirm Pro activation, API authentication, access revocation, quotas/rate limits, account and group permissions, and behaviour when Pro expires or is downgraded. Document supported behaviour rather than designing it in marketing copy.
- [ ] Confirm whether MCP and each plugin require Pro, which clients are supported, and which installations/listings are actually public.
- [ ] Reconcile stale or contradictory content. A candidate identified during research is the how-it-works currency explanation versus newer conversion wording; verify against the current app before changing it.
- [ ] Audit blanket claims such as "everything is free", "no daily limits" and "no subscriptions" against the new offering. State the scope of free-app claims and Pro API limits precisely; check policies as well as pricing.

### 2. Improve product discovery copy

- [ ] Review the homepage opening paragraph so it names Side Badger as a bill-splitting app, its audiences and concrete supported capabilities in one concise passage.
- [ ] Review feature/use-case pages for explicit task-to-capability explanations: unequal contributions, excluding absent participants, group-trip currencies and tracking payments made elsewhere.
- [ ] Make key FAQ answers self-contained, with verified account requirements, supported splits, currency behaviour, money-transfer boundaries, connectivity needs and plan limits.
- [ ] Keep factual descriptions accessible in rendered HTML, with descriptive internal links and visible copy matching metadata/JSON-LD.

Draft direction for the homepage, to verify and reconcile with Pro messaging before use:

> Side Badger is a bill-splitting app for housemates, couples and group trips. Track shared expenses in 140 currencies, split costs equally, by exact amounts or by percentage, and see who owes whom. Use it in your browser, with no ads.

Explain the free offering and Pro API separately using the confirmed pricing model. This is a writing example, not final approved copy.

### 3. Publish usable integration documentation

- [ ] Choose the documentation location and page structure. Provide a public, indexable integration overview linking to API, MCP, ChatGPT and Claude setup guides; final paths are to be settled during implementation.
- [ ] **API overview and quickstart:** state the Pro requirement before setup, show how to obtain access, identify the verified production base URL/version, and provide a working request/response example and troubleshooting for missing entitlement or authentication.
- [ ] **API reference:** publish the authoritative machine-readable contract (OpenAPI if supported by the implementation), with authentication, scopes/permissions, endpoint inputs/outputs, amounts/currencies/dates, pagination, errors, rate limits, retries/idempotency where supported, and version/deprecation guidance. Keep executable examples aligned with that contract.
- [ ] **MCP setup:** document the verified endpoint, transport, supported clients, authentication/account linking, entitlements, tool capabilities and limits, reconnect/revoke steps, and an end-to-end example.
- [ ] **ChatGPT plugin:** link the verified public installation/listing when available. Explain MCP plus skills, account linking, prerequisites, example prompts, supported actions and troubleshooting. Reuse the existing delivery record and package.
- [ ] **Claude plugin:** document its actual installation/distribution route, MCP plus skills, supported clients, account linking, prerequisites, example prompts, supported actions and troubleshooting. Do not assume ChatGPT's packaging or listing process applies.
- [ ] Describe agent tasks explicitly: when to use Side Badger, required information, expected result, permission boundaries and any confirmation steps required by the integration. Verify reads, expense creation, receipt handling and payment recording individually; do not imply all app features have tools.
- [ ] Provide complete worked workflows using fictional data and actual supported operations. Explain that recording a settlement does not transfer money.
- [ ] Reconcile website copy with tool descriptions, shared skills and plugin listings. Track required changes in the repository that owns each source rather than copying implementations into this site.
- [ ] Evaluate an optional `llms.txt`/Markdown documentation index after the canonical docs exist. If useful, generate it from maintained sources and keep capability/plan/status claims consistent. It is not a prerequisite for launch.

### 4. Serve Markdown to agents

Owner requested on 18 November 2026. Include Markdown representations of public product and documentation pages, prioritising the product overview, pricing and API/MCP/plugin guides. This helps agents consume the information after finding it; HTML discovery and usable integrations remain necessary.

- [x] Generate Markdown at build time from the same maintained content as HTML. Preserve meaningful headings, factual copy, plan requirements, limits, examples and links; omit decorative scenes and repeated site chrome. Do not maintain a second set of marketing claims.
- [x] Serve a page's Markdown representation at its existing canonical URL when the request explicitly prefers `Accept: text/markdown`. Respect media-type quality values and exclusions (`q=0`); define and test tie handling. Missing headers, `*/*` alone and normal browser requests should continue to receive HTML. Do not use User-Agent detection.
- [ ] Return `Content-Type: text/markdown; charset=utf-8` for Markdown and include `Accept` in `Vary` on both negotiated representations, preserving existing dimensions such as `Accept-Encoding`. Verify variant separation through the actual nginx/proxy/cache configuration; headers alone are not evidence of correct cache behaviour. Use validators appropriate to each representation.
  - Implemented and checked against the packaged nginx image; deployed edge/cache verification remains open.
- [ ] Provide discoverable Markdown links for clients that cannot set request headers. Decide their URL convention within the site's URL policy and link them from the integration/docs overview; document content negotiation there too.
  - HTML alternate links and `index.md` assets are implemented. Linking and explaining them in the future public integration/docs overview remains open.
- [x] Preserve locale, publication status, noindex rules, canonical identity and link destinations. Never expose preview/unpublished pages through generated Markdown. Preserve launch-link routing and do not publish private app/account data.
- [ ] Add focused checks for content parity, working links, negotiation preferences, response types, redirects/404s, HEAD requests, and alternating HTML/Markdown requests through the deployed serving stack. Run tests serially with one worker.
  - All these checks pass locally, including the packaged production image. Repeat the HTTP checks through the public proxy after deployment.

### 5. Validate and release

- [ ] Verify setup and quickstarts from a fresh account/client against the released implementation, including Pro access and relevant refusal/error cases. Distinguish observed results from assumptions.
- [ ] Register new site pages as unpublished first. Follow the site's URL helpers, launch-link component, content schemas, translation/review rules and strict-mode deployment gate. Decide API-reference localisation deliberately within those rules rather than adding English fallback at localized URLs.
- [ ] Run the appropriate site checks for the eventual changes and browser checks where layout/navigation changes. Run all tests serially with one worker and ensure no other controlled test run is active first.
- [ ] Publish only links and capabilities whose release status has been verified. Keep upcoming integration drafts in preview until ready.
- [ ] Establish a small, fixed evaluation set of realistic discovery and integration tasks. Record assistant/model/date, recommendations, factual errors, cited URLs, successful setup and task completion before and after changes. Repeat observations to account for variation; distinguish citations from actual use.
- [ ] Use existing Search Console and first-party launch measurement where applicable. Do not introduce third-party analytics as part of this work.

## Acceptance criteria

- A visitor or assistant can determine what Side Badger does, when it fits, its relevant limits, and how to start without guessing from slogans.
- API access is clearly labelled as a Pro feature wherever it is offered or documented. MCP/plugin eligibility is stated accurately once decided.
- The API, standalone MCP route, ChatGPT plugin and Claude plugin each have an accurate status, setup route and practical example when released.
- An agent can follow a discover → assess fit → choose integration → connect → complete a supported task journey. Evaluation records where it succeeds or fails rather than counting mentions as completed use.
- Public Markdown representations agree with HTML, are discoverable, and are served correctly for `Accept: text/markdown` without mixing HTML and Markdown in caches or exposing unpublished content.
- Documentation examples match the shipped contracts, and website, pricing, policies and integration materials make consistent claims.
- Outstanding upstream decisions or release dependencies are explicit; unsupported capabilities and unpublished marketplace availability are never presented as live.

## Dependencies to resolve during implementation

- API contract, authentication and release/version policy from the application repository.
- Pro price, quotas, entitlement lifecycle and corresponding billing/policy wording.
- MCP, ChatGPT and Claude entitlement decisions and confirmed distribution/install details.
- Final documentation hosting, public URLs and localisation approach.
- Up-to-date production and marketplace verification, building on the existing ChatGPT delivery record.

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

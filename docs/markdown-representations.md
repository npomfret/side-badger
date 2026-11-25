# Markdown representations

The Astro build generates `index.md` beside each published page's `index.html`.
For example, `/pricing/index.md` is the downloadable representation of `/pricing/`.
These are alternate assets; the page's canonical URL still ends in `/`.

Each HTML page advertises its Markdown asset with
`<link rel="alternate" type="text/markdown" href="…">`.
Clients can follow that link even if their fetch tool cannot set request headers.
Eligible HTML documents also put a short AI-agent instruction immediately after
the doctype, so clients inspecting raw HTML discover both options before parsing
the document head. The same source-only comment distinguishes the marketing site
from `https://app.sidebadger.me/`, gives the production MCP endpoint and its OAuth
account-linking requirement, and points connected clients to `tools/list` for
current schemas. It names the shared `manage-shared-expenses` workflow skill when
an integration supplies it. Public skill downloads and REST API reference links
remain unadvertised until their owning integration work publishes them. This
machine-facing instruction stays in English and adds no visible or accessible
page copy.

The production nginx configuration also negotiates Markdown at the page URL:

```sh
curl -H 'Accept: text/markdown' https://sidebadger.me/pricing/
```

Explicit `text/markdown` preferences are compared with the effective HTML
preference, including `text/*` and `*/*` fallback ranges. Markdown wins a tie.
`q=0` excludes Markdown; an absent header or wildcard alone leaves HTML selected.
Repeated identical media ranges use the first occurrence, and malformed quality
values are treated as zero. Unsupported preferences fall back to HTML.
Negotiation uses no User-Agent detection. Slash/alias redirects, launch-counter
redirects, static assets and unknown-page responses retain their usual behaviour.

Markdown responses use `Content-Type: text/markdown; charset=utf-8`.
Both representations include `Vary: Accept`, including on revalidation, and
nginx generates validators from the selected file. The shared proxy must preserve
this header and separate variants if caching is enabled. Origin verification
does not establish the behaviour of a separately configured edge cache.

## Content and publication

`scripts/markdown/index.mjs` converts the rendered `<main>` using Turndown and its
GFM extension during `astro:build:done`. This keeps copy, translations, FAQ answers,
feature limits and computed examples tied to the same sources as HTML.
Navigation, scripts, hidden decoration and simulated homepage app screens are
omitted. Use-case explanations and their links remain. Links become absolute so
extracted documents retain working destinations, including `/go/` launch routing.

Frontmatter records the page title, description, original URL, language and
indexability. The registry restricts generation to published, actually built
page/locale pairs. Preview pages, pseudo-locales, the 404 page and the legal
pages (privacy, terms, cookies) have no Markdown asset or alternate link: a legal
page's policy text is loaded from the app API in the browser, so its built HTML is
only a loading shell and a Markdown copy would misrepresent it as the policy. The
policy's own source is `https://app.sidebadger.me/api/policies/<id>/text`.
`hasMarkdownAlternate` (`src/site/pages.ts`) decides, for the link, the generator
and the output check alike.

The build also writes `.astro/markdown-headers.conf`, which Docker copies into
nginx's private configuration directory. It supplies canonical HTTP links and
source `noindex` rules for Markdown responses. Explicit `index.md` URLs always
receive `X-Robots-Tag: noindex`; negotiated responses at page URLs retain the
source page's indexing policy. No generated server configuration is placed in
`dist/`.

## Development and checks

Generation happens during `npm run build`. Header negotiation belongs to nginx;
Astro's dev/preview server does not implement that part of the production stack.
The generated quality-preference maps are checked in as
`nginx/markdown-negotiation.conf`. After changing their generator, run:

```sh
node scripts/markdown/nginx.mjs
```

Run the unit suite, build and output checks serially, using one worker. The
normal nginx smoke test now also runs `scripts/check-markdown.mjs` sequentially.
It checks preferences, body types, direct alternates, redirects, missing pages,
HEAD, canonical/noindex headers and cross-representation revalidation.
It can also check an existing server:

```sh
node scripts/check-markdown.mjs http://127.0.0.1:18200
```

After deployment, run that check against the public origin as well to detect
proxy differences. Markdown supports consumption of product information; API,
MCP and plugin setup documentation is still required for agents to act.

# Baseline measurements (before the redesign)

- Date: 2026-10-14
- Commit: `bc01126` (`main`, working tree clean when the measurement started)
- Later commits: `main` moved on while this was written (`2f9b773` changes the app link and policy API base in `src/i18n/index.ts` to `app.sidebadger.me`; `76a2a7f` only touches `tasks/`). The measured build is `bc01126`, so its app links still point at `staging.sidebadger.me`. The change is a URL string, so no effect on the numbers is expected, but it was not re-measured.
- Scope: performance and visual baseline of the current marketing site, measured on a local production build. Nothing was changed, committed or deployed; no remote server was contacted for the site itself.
- Pages: `/`, `/pricing/`, `/ja/`, `/ar/` (Lighthouse); `/` and `/pricing/` in `en`, `ar`, `ja`, `hi` (screenshots).

## Summary

- Median performance scores: mobile 73 to 79 (individual runs 71 to 80), desktop 96 to 99 (individual runs 91 to 99). Median mobile LCP is 5.04 s on `/`, 4.96 s on `/pricing/`, 7.25 s on `/ja/` (one 11.6 s outlier run) and 5.98 s on `/ar/`. CLS is 0.000 to 0.074 everywhere (all under 0.1). TBT is 0 to 14 ms.
- The LCP element is usually text (`h1#hero-title` or its gradient span, the hero subtitle, or the price on `/pricing/`), not an image. In the unthrottled trace, LCP was 0.2 to 1.7 s, made up of about 4 ms to first byte plus "element render delay"; the 5 to 7 s mobile figures are Lighthouse's simulated slow-4G, 4x CPU estimate of the same load.
- Most of the page weight and request count is third-party. On `/`, 48 of 61 requests go to `cdn.jsdelivr.net` (42 flag SVGs for the language dropdown) and Google Fonts. The Google Fonts stylesheet is pulled in with a CSS `@import` in `src/styles/global.css`; it is 372,758 bytes raw (93.6 KiB over the wire) and is render-blocking.
- `/ja/` makes 101 requests and transfers 1.51 MiB because Noto Sans JP is served as 40 unicode-range font slices (1,078,404 bytes of fonts in total, 1.03 MiB).
- The largest single first-party transfer on every page is `/flags/iran.png` (216,172 bytes, 211 KiB), requested on page load.
- First-party JS is one large file: the tsparticles bundle `FloatingParticles...js` (148,141 bytes raw, about 40 KB brotli).
- Accessibility: 95 on `/` and `/ja/`, 98 on `/ar/`, 100 on `/pricing/`. SEO: 92 on all four pages. Failing audits are listed below.

## How it was built and served

1. Private copy: `rsync` of the repo (excluding `node_modules`, `dist`, `.astro`) into a scratch directory, `npm run build` there (Astro 5, 231 pages). Build output is in that scratch directory only. The copy was at `bc01126` with no changes.
2. Production image: `docker build` of that copy using the repo `Dockerfile` (Node 22 builder, then `nginx:1.27-alpine` with `nginx/default.conf`). The `dist/` inside the image was diffed against the local build and is identical (the only difference is nginx's own `50x.html`).
3. Run: container on `127.0.0.1:18481` (nginx 1.27.5). nginx sends no compression (by design, see `nginx/default.conf`).
4. Edge stand-in: production compresses at the shared Snowmonkey edge. To approximate it, a small Node reverse proxy on `127.0.0.1:18482` forwarded to the container and compressed text responses (HTML, CSS, JS, JSON, SVG, plain text) with brotli quality 6 or gzip level 6, chosen from `Accept-Encoding`. All Lighthouse and screenshot runs used port 18482. The container and proxy were stopped afterwards.

How this differs from production:

- Plain HTTP/1.1 over loopback: no TLS, no HTTP/2 or HTTP/3, no real network path or CDN. Lighthouse's simulated throttling (below) is applied on top, so the numbers model a slow link but do not include real latency to the origin.
- The real edge's compression types and levels are not known; brotli q6 and gzip 6 are assumptions. Transfer sizes for first-party text may differ by a few percent.
- No HSTS (the edge adds it). The other response headers are the same as production because nginx sets them.
- Google Fonts and jsDelivr requests went to the real internet from this machine, so those timings and sizes reflect live third-party hosts on the day.
- Local `/health` and `/robots.txt` behave as in the image; `robots.txt` and `hreflang` URLs still point at `https://sidebadger.me`.

## Tools and settings

| Item | Version or value |
|---|---|
| Lighthouse | 13.5.0 (`npx lighthouse@13.5.0`), simulated throttling, categories performance, accessibility and SEO in every run |
| Browser for Lighthouse | Google Chrome 155.0.8059.41, `--headless=new` |
| Mobile profile (default) | Moto G Power (2022) emulation, 412x823 at 1.75 DPR, 150 ms RTT, 1,638 Kbps, 4x CPU slowdown |
| Desktop profile (`--preset=desktop`) | 1350x940, 40 ms RTT, 10,240 Kbps, no CPU slowdown |
| Screenshots | Playwright 1.64.1, Chromium 156.0.8078.4 (headless) |
| Host | macOS (Darwin 27.0.0), Node v24.21.0, npm 11.19.0, Docker 29.8.1 |
| Lighthouse CPU benchmark index | 4325.5-4637.5 across runs (recorded so a later run on another machine can be compared) |
| Runs | 3 per page and device, run one after another. Other agents were working on the same machine at the time, so some CPU contention cannot be ruled out. The table values are the median of each metric taken separately, so a row is not one real run. Individual run scores are in brackets. |

Raw Lighthouse JSON (24 reports), the proxy script and the screenshot script are in the session scratchpad, not in the repo.

## Lighthouse results: mobile

| Page | Perf score (runs) | FCP | LCP (runs) | CLS | TBT | Speed Index |
|---|---|---|---|---|---|---|
| `/` | **78** (78, 79, 71) | 2.22 s | **5.04 s** (5.1, 5.0, 5.0) | 0.039 | 0 ms | 2.94 s |
| `/pricing/` | **79** (79, 80, 79) | 2.21 s | **4.96 s** (5.0, 4.8, 5.0) | 0.000 | 14 ms | 2.21 s |
| `/ja/` | **73** (71, 73, 73) | 2.22 s | **7.25 s** (11.6, 7.2, 6.7) | 0.074 | 11 ms | 2.22 s |
| `/ar/` | **75** (75, 76, 74) | 2.26 s | **5.98 s** (5.7, 6.0, 6.2) | 0.066 | 2 ms | 2.26 s |

| Page | Total transfer | JS | CSS | Images | Fonts | HTML | Requests | Third-party requests / bytes |
|---|---|---|---|---|---|---|---|---|
| `/` | 646.4 KiB | 47.9 KiB | 99.5 KiB | 295.4 KiB | 189.4 KiB | 12.2 KiB | 61 | 48 / 310.8 KiB |
| `/pricing/` | 640.3 KiB | 47.1 KiB | 98.9 KiB | 277.5 KiB | 189.4 KiB | 7.6 KiB | 60 | 48 / 311.2 KiB |
| `/ja/` | 1546.2 KiB | 47.9 KiB | 99.5 KiB | 330.7 KiB | 1053.1 KiB | 13.1 KiB | 101 | 88 / 1174.8 KiB |
| `/ar/` | 829.0 KiB | 47.9 KiB | 99.5 KiB | 328.9 KiB | 337.7 KiB | 13.0 KiB | 64 | 51 / 459.5 KiB |

## Lighthouse results: desktop

| Page | Perf score (runs) | FCP | LCP (runs) | CLS | TBT | Speed Index |
|---|---|---|---|---|---|---|
| `/` | **97** (96, 98, 97) | 0.64 s | **1.09 s** (1.1, 1.1, 1.1) | 0.011 | 0 ms | 0.64 s |
| `/pricing/` | **99** (99, 99, 98) | 0.62 s | **0.97 s** (1.0, 1.0, 1.1) | 0.004 | 0 ms | 0.62 s |
| `/ja/` | **96** (91, 96, 97) | 0.63 s | **1.34 s** (1.9, 1.3, 1.2) | 0.024 | 0 ms | 0.63 s |
| `/ar/` | **96** (96, 96, 97) | 0.62 s | **1.29 s** (1.3, 1.3, 1.2) | 0.048 | 0 ms | 0.62 s |

| Page | Total transfer | JS | CSS | Images | Fonts | HTML | Requests | Third-party requests / bytes |
|---|---|---|---|---|---|---|---|---|
| `/` | 646.8 KiB | 47.9 KiB | 99.5 KiB | 295.8 KiB | 189.4 KiB | 12.2 KiB | 61 | 48 / 311.2 KiB |
| `/pricing/` | 629.3 KiB | 47.1 KiB | 98.9 KiB | 266.6 KiB | 189.4 KiB | 7.6 KiB | 60 | 48 / 300.3 KiB |
| `/ja/` | 1535.4 KiB | 47.9 KiB | 99.5 KiB | 319.8 KiB | 1053.1 KiB | 13.1 KiB | 101 | 88 / 1164.0 KiB |
| `/ar/` | 818.1 KiB | 47.9 KiB | 99.5 KiB | 318.0 KiB | 337.7 KiB | 13.0 KiB | 64 | 51 / 448.6 KiB |

Notes on the tables:

- LCP, FCP and Speed Index are Lighthouse's simulated (throttled) values. The unthrottled LCP observed in the trace was 0.2 to 1.7 s on every page and device (highest: `/` mobile at 1.5, 0.3 and 1.7 s, where observed FCP was 1.2 s in two of the three runs and 0.2 s in the third; the cause was not isolated).
- LCP in brackets is the three run values in seconds. `/ja/` mobile has one 11.6 s run (the other two are 7.2 s and 6.7 s); the median is 7.2 s. Treat `/ja/` mobile as noisy.
- Transfer columns are Lighthouse's `resource-summary` (bytes on the wire, headers included, from the proxy's brotli). "Images" includes the 42 flag SVGs and `flags/iran.png`. Third-party is anything not on `127.0.0.1:18482`.
- Requests counts include a `data:` image and the manifest.

### LCP element

| Page | Device | LCP element (most common across 3 runs) |
|---|---|---|
| `/` | mobile | `div.hero-content > h1#hero-title` x2; `div.hero-image-container > img.hero-badger` x1 |
| `/pricing/` | mobile | `div.plan-price > span.amount` x3 |
| `/ja/` | mobile | `h1#hero-title > span.gradient-text` x2; `div.hero-image-container > img.hero-badger` x1 |
| `/ar/` | mobile | `div.hero-content > p.hero-subtitle` x2; `div.hero-image-container > img.hero-badger` x1 |
| `/` | desktop | `h1#hero-title > span.gradient-text` x3 |
| `/pricing/` | desktop | `div.plan-price > span.amount` x3 |
| `/ja/` | desktop | `h1#hero-title > span.gradient-text` x3 |
| `/ar/` | desktop | `h1#hero-title > span.gradient-text` x3 |

The LCP element changes between runs on some pages because the hero text, the logo image and the animated subtitle finish painting at similar times. LCP breakdown on the text cases is about 4 ms to first byte and 0.2 to 1.7 s element render delay; the image case shows about 6 ms load delay and 6 ms load duration (the file is local).

### Largest transfers on `/` (mobile, run 1)

| Resource | Type | Over the wire |
|---|---|---|
| `/flags/iran.png` | Image | 216,774 B |
| Inter woff2, 4 files (85,311 + 48,464 + 19,073 + 18,773) | Font | 171,621 B |
| `https://fonts.googleapis.com/css2?family=Inter...` (372,758 bytes raw) | Stylesheet | 93,604 B |
| `_astro/FloatingParticles...js` | Script | 40,961 B |
| `/images/en/logo-transparent-small.png` | Image | 36,302 B |
| 42 flag SVGs from `cdn.jsdelivr.net` | Image | 30,663 B combined |
| Space Grotesk woff2 | Font | 22,349 B |
| `/images/logo-face-only-large.png` | Image | 18,740 B |
| `_astro/index.cqeq60qY.css` | Stylesheet | 5,752 B |

Lighthouse's own flags on `/` (mobile): render-blocking resources (Google Fonts CSS plus the two `_astro` stylesheets, estimated 1,010 ms FCP and LCP saving), unused CSS in the Google Fonts stylesheet (91 KiB), image delivery (48 KiB estimated on the two PNG logos), unsized images (`logo-face-only-large.png` and `logo-transparent-small.png`), unminified CSS (10 KiB, in the Google Fonts stylesheet).

## Accessibility and SEO

Scores are identical across the three runs of each page and across mobile and desktop except where shown. Failing audits listed by Lighthouse id, with the number of failing items in brackets.

| Page | Accessibility | SEO | Failing accessibility audits | Failing SEO audits |
|---|---|---|---|---|
| `/` | 95 mobile / 95 desktop | 92 mobile / 92 desktop | `color-contrast` (2), `heading-order` (1) | `hreflang` (1) |
| `/pricing/` | 100 mobile / 100 desktop | 92 mobile / 92 desktop | none | `hreflang` (1) |
| `/ja/` | 95 mobile / 95 desktop | 92 mobile / 92 desktop | `color-contrast` (2), `heading-order` (1) | `hreflang` (1) |
| `/ar/` | 98 mobile / 98 desktop | 92 mobile / 92 desktop | `heading-order` (1) | `hreflang` (1) |

Detail on the failing audits:

- `color-contrast` (`/`, `/ja/`): two `div.coming-soon-badge` badges on the feature cards ("COMING SOON"), foreground `#80a28e` on `#e0fce9`, contrast 2.57:1 (4.5:1 required, 12.23 px text).
- `heading-order` (`/`, `/ja/`, `/ar/`): `h4#footer-product-heading` in the footer follows a heading level it skips. Not reported on `/pricing/`.
- `hreflang` (all pages): `<link rel="alternate" hreflang="ph" href="https://sidebadger.me/ph">` uses the language code `ph`, which Lighthouse does not accept as a language code. All other hreflang values pass.
- Not a Lighthouse failure but visible in the HTML of `/`: there is no `<link rel="canonical">` (Lighthouse reports the canonical audit as not applicable), `og:image` is a relative path (`/images/en/logo-transparent.png`), and the hreflang URLs have no trailing slash (`/ar`) while the built pages are `/ar/index.html`. nginx serves both `/ar` and `/ar/` with 200.

## Static weight

Built `dist/` is 59 MB in total, of which `dist/images` is 47 MB (25 files).

### `dist/_astro`

| File in `dist/_astro/` | Raw (bytes) | Gzip -6 (bytes) | Brotli q6 (bytes) |
|---|---|---|---|
| `_astro/FloatingParticles.astro_astro_type_script_index_0_lang.C3p_8SUb.js` | 148,141 | 42,753 | 40,265 |
| `_astro/PolicyPage.astro_astro_type_script_index_0_lang.8irFPSdF.js` | 67,176 | 22,572 | 21,784 |
| `_astro/index.cqeq60qY.css` | 21,677 | 5,427 | 5,086 |
| `_astro/PolicyPage.CSRUKxnt.css` | 18,349 | 3,868 | 3,569 |
| `_astro/confetti.module.oQXWb4Lk.js` | 10,670 | 4,277 | 4,126 |
| `_astro/index.n-awwtzH.css` | 8,665 | 2,073 | 1,896 |
| `_astro/pricing.AGmYslLc.css` | 5,815 | 1,352 | 1,237 |
| `_astro/HomePage.astro_astro_type_script_index_0_lang.CMp_qmf9.js` | 2,848 | 1,204 | 1,065 |
| `_astro/EasterEggs.astro_astro_type_script_index_0_lang.DkmHUeWl.js` | 2,124 | 960 | 860 |
| `_astro/PricingPage.astro_astro_type_script_index_0_lang.By0pwROc.js` | 388 | 311 | 272 |
| **Total (10 files)** | 285,853 | 84,797 | 80,160 |

The `PolicyPage` script and stylesheet are only used by the policy pages (`/privacy/`, `/terms/`, `/cookies/`). `pricing.*.css` and `PricingPage...js` are only used by `/pricing/`. The home page links `index.cqeq60qY.css`, `index.n-awwtzH.css`, `FloatingParticles...js`, `EasterEggs...js` and `HomePage...js`, and loads `confetti.module...js` after that. `/pricing/` links `index.cqeq60qY.css`, `pricing...css`, `FloatingParticles...js`, `EasterEggs...js` and `PricingPage...js`.

### HTML

| Page | Raw (bytes) | Gzip -6 (bytes) | Brotli q6 (bytes) |
|---|---|---|---|
| `/` | 75,219 | 13,454 | 11,901 |
| `/pricing/` | 41,870 | 8,133 | 7,182 |
| `/ja/` | 77,713 | 15,049 | 12,744 |
| `/ar/` | 79,966 | 14,708 | 12,714 |

### Images in `dist` (public assets)

| Files | Size each | Notes |
|---|---|---|
| `images/{ja,ko,hi,ar,uk}/logo-large*.png` | 2.96 to 5.52 MB | 5 `logo-large.png` files (4.45 to 5.52 MB) plus 5 `logo-large-transparent.png` files (2.96 to 3.45 MB), about 41 MB together. No reference to `logo-large*` found in `src/` or `public/manifest.json`; not requested by any page measured. |
| `images/{ko,hi,ja,uk,ar}/logo-transparent.png` | 273 to 298 KB | `en` version is 81 KB. Used as `og:image` and `largeLogoPath` in `BaseLayout.astro`. |
| `images/*/logo-transparent-small.png` | 36 KB (`en`), 70 to 78 KB (other locales) | Loaded by the header on every page. |
| `flags/iran.png` | 216 KB | Requested on every page load. |
| `images/logo-face-only-large.png` | 18 KB | Hero image, favicon, apple-touch-icon, manifest icon. |

## Screenshots

Full-page PNGs of the current pages at mobile (390x844, mobile emulation, DPR 1) and desktop (1440x900, DPR 1). Taken from the same local build.

| Locale | Page | Mobile | Desktop |
|---|---|---|---|
| en | Home | [en-home-mobile.png](baseline-screenshots/en-home-mobile.png) | [en-home-desktop.png](baseline-screenshots/en-home-desktop.png) |
| en | Pricing | [en-pricing-mobile.png](baseline-screenshots/en-pricing-mobile.png) | [en-pricing-desktop.png](baseline-screenshots/en-pricing-desktop.png) |
| ar | Home | [ar-home-mobile.png](baseline-screenshots/ar-home-mobile.png) | [ar-home-desktop.png](baseline-screenshots/ar-home-desktop.png) |
| ar | Pricing | [ar-pricing-mobile.png](baseline-screenshots/ar-pricing-mobile.png) | [ar-pricing-desktop.png](baseline-screenshots/ar-pricing-desktop.png) |
| ja | Home | [ja-home-mobile.png](baseline-screenshots/ja-home-mobile.png) | [ja-home-desktop.png](baseline-screenshots/ja-home-desktop.png) |
| ja | Pricing | [ja-pricing-mobile.png](baseline-screenshots/ja-pricing-mobile.png) | [ja-pricing-desktop.png](baseline-screenshots/ja-pricing-desktop.png) |
| hi | Home | [hi-home-mobile.png](baseline-screenshots/hi-home-mobile.png) | [hi-home-desktop.png](baseline-screenshots/hi-home-desktop.png) |
| hi | Pricing | [hi-pricing-mobile.png](baseline-screenshots/hi-pricing-mobile.png) | [hi-pricing-desktop.png](baseline-screenshots/hi-pricing-desktop.png) |
| en | Home, reduced motion emulated | | [en-home-desktop-reduced-motion.png](baseline-screenshots/en-home-desktop-reduced-motion.png) |

Page heights at capture: `en` home 15,249 px mobile and 8,662 px desktop; `en` pricing 4,072 px and 2,549 px. No horizontal overflow at either width in any capture (document width equal to viewport width).

How they were taken: each page was loaded, left for 2 s, scrolled top to bottom in 350 px steps (so the `.fade-up` sections, which only show once scrolled into view, are revealed), returned to the top, left for 1.5 s, then captured with `fullPage`. The reduced-motion image used Playwright's `reducedMotion: 'reduce'` (CSS media emulation) with the same steps.

## Caveats

- Local, not production: see "How it was built and served". Numbers here exclude real network latency, TLS, HTTP/2 and the real edge's compression settings.
- Lighthouse uses simulated throttling. Run-to-run spread on this machine was up to 8 points on mobile performance (1 point on `/pricing/`) and up to 5 s on one `/ja/` LCP run (11.6 s against 6.7 s; the cause was not isolated). Differences smaller than that are not meaningful.
- Third-party hosts (Google Fonts, jsDelivr) were live. If either was slow or cached differently on another day, the Google Fonts stylesheet and font sizes can change.
- The hero subtitle and gradient text animate (typewriter-style text, moving gradient) and the background canvases run continuously, so any screenshot is one arbitrary frame; hero text in the captures can be mid-animation. In the reduced-motion capture the hero subtitle still shows a caret and a partial line, so whether reduced motion fully stops those animations was not checked.
- The header glass panel renders as a dark grey-green bar in these headless captures. It was not compared against a headed browser.
- The screenshots were scrolled through once before capture; a capture without scrolling would show the `.fade-up` sections as empty space.
- Policy pages (`/privacy/`, `/terms/`, `/cookies/`) were not measured: they fetch their content from the external API at runtime.
- Only four pages were audited with Lighthouse. Other locales (`hi`, `ko`, `uk`, `fa` and so on) were only screenshotted (and only `hi`, `ar`, `ja` at that), so locale-specific font weight, as seen on `/ja/`, was not measured for them.
- Accessibility scores come from Lighthouse's automated axe checks only; manual checks (keyboard, screen reader, RTL reading order) were not done.
- Lighthouse does not report INP or field data. No real-user data was available.

## Production re-baseline

Local numbers miss network and edge effects. Once `https://sidebadger.me` is back up, re-run the same Lighthouse version and commands against it and record the results alongside the tables above (same Chrome flags, 3 runs, medians):

```bash
mkdir -p lh-prod && cd lh-prod
for dev in mobile desktop; do
  for page in "/:home" "/pricing/:pricing" "/ja/:ja-home" "/ar/:ar-home"; do
    path=${page%%:*}; name=${page##*:}
    for n in 1 2 3; do
      if [ "$dev" = desktop ]; then preset=--preset=desktop; else preset=--form-factor=mobile; fi
      npx lighthouse@13.5.0 "https://sidebadger.me$path" $preset \
        --only-categories=performance,accessibility,seo --output=json \
        --output-path="$name-$dev-$n.json" --chrome-flags="--headless=new" --quiet
    done
  done
done
```

Record the commit that was deployed, the Lighthouse and Chrome versions, and the date. Also note the response headers actually seen from the edge (`content-encoding`, `cache-control`, HTTP version), since those decide the transfer sizes and caching that the local run could only approximate. The screenshots in `baseline-screenshots/` can be retaken against production with the same viewport sizes if the deployed commit is not `bc01126`.

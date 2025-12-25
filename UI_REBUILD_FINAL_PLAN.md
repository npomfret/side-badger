# Side Badger UI Rebuild — Consolidated "Best Of" Plan

**Curated from:** UI_REBUILD_PLANS_1.md, UI_REBUILD_PLANS_2.md, UI_REBUILD_PLANS_3.md

---

## Design Direction Summary

| Aspect | Choice |
|--------|--------|
| **Background** | Caustic Light Ripples |
| **Motion** | Calm & Floating (slow, meditative) |
| **Surfaces** | Multi-layer glass with Z-depth |
| **Demo Window** | Maybe later (Phase 2 enhancement) |
| **Easter Eggs** | Keep & restyle |

---

## Color Palette (Green-Based — Lighter Forest)

```css
:root {
  /* Lighter forest base — still dark but more breathable */
  --bg-void: #0c1f16;      /* Softer than current #0a2818 */
  --bg-deep: #132f22;      /* Lighter forest floor */
  --bg-surface: #1a4030;   /* Elevated surfaces */

  /* Glass surfaces — mint-tinted */
  --glass-primary: rgba(78, 170, 130, 0.10);
  --glass-secondary: rgba(95, 176, 196, 0.08);
  --glass-highlight: rgba(255, 255, 255, 0.12);

  /* Accent spectrum — keeping brand greens + teal + amber */
  --accent-primary: #7ec786;   /* Bright green (from logo) */
  --accent-secondary: #5fb0c4; /* Teal */
  --accent-tertiary: #f0c05c;  /* Amber */
  --accent-mint: #4eeab5;      /* Mint success */

  /* Aurora colors — forest mist */
  --aurora-green: rgba(126, 199, 134, 0.5);
  --aurora-teal: rgba(95, 176, 196, 0.45);
  --aurora-amber: rgba(240, 192, 92, 0.35);

  /* Text */
  --text-primary: #f8fafc;
  --text-secondary: rgba(248, 250, 252, 0.85);
  --text-muted: rgba(248, 250, 252, 0.6);
}
```

**Palette Philosophy:** Keep the brand's forest/woodland identity but lift the darkness. The caustic ripples will use green/teal/amber instead of violet/cyan.

---

## Key Visual Effects (Best Of)

### 1. Caustic Light Ripples ← Plans_3
**Hero background effect** — light refracting through water

- Canvas 2D with Perlin noise
- Colors: **green, teal, amber** on dark forest void
- 15-20 second organic animation cycle
- Reduced motion fallback: static gradient

### 2. Multi-Layer Glass System ← Plans_3
Surfaces at different Z-depths with varying blur:

```css
.glass-layer-1 { backdrop-filter: blur(40px); transform: translateZ(40px); }
.glass-layer-2 { backdrop-filter: blur(24px); transform: translateZ(20px); }
.glass-layer-3 { backdrop-filter: blur(12px); transform: translateZ(0); }
```

### 3. Context-Aware Blur ← Plans_1
- Hero/pricing cards: heavy blur + refraction glow
- Secondary cards: matte/reduced blur for hierarchy
- Blur intensity signals importance

### 4. Edge Luminance Borders ← Plans_3
- `border-image` with linear gradient
- Thin bright edges that catch light
- Creates jewel-like faceted appearance

### 5. Cursor Aurora ← Plans_3
- 400px radius soft gradient follows mouse
- Iridescent tint (violet ↔ cyan shift)
- Smooth interpolation (0.08 factor for dreamy lag)
- Disabled on touch devices

### 6. Breathing Surfaces ← Plans_3
- 6-8 second gentle pulse cycle
- 1-2% scale variation
- Subtle opacity shift (0.98 → 1.0)
- Staggered start times for organic feel

### 7. Navigation Chroma ← Research
Header subtly tints based on current scroll section:
```css
[data-section="features"] .header {
  background: color-mix(in srgb, var(--glass-primary) 90%, var(--accent-primary) 10%);
}
[data-section="pricing"] .header {
  background: color-mix(in srgb, var(--glass-primary) 90%, var(--accent-secondary) 10%);
}
[data-section="cta"] .header {
  background: color-mix(in srgb, var(--glass-primary) 90%, var(--accent-tertiary) 10%);
}
```

### 8. Edge Highlights via `mask-image` ← Research
Simulate light hitting curved glass:
- `mask-image: radial-gradient()` along edges
- Scales on hover for refraction effect
- Paired with `filter: drop-shadow()` for ambient glow

---

## Motion System (Calm & Floating)

### Timing Tokens ← Plans_3
```css
--ease-smooth: cubic-bezier(0.22, 1, 0.36, 1);
--ease-float: cubic-bezier(0.4, 0, 0.2, 1);

--duration-instant: 100ms;
--duration-fast: 200ms;
--duration-base: 400ms;
--duration-slow: 600ms;
--duration-ambient: 8000ms;
```

### Interaction States ← Plans_1 + Plans_3
- **Hover:** 2px lift + soft glow increase (shared pattern from Plans_1)
- **Focus:** Ring with soft glow, no harsh outlines
- **Active:** Subtle scale down (0.98), quick snap back

### Scroll Reveals ← Plans_3
- Elements fade in with subtle blur clearing
- Y-offset: 20px (gentle, not dramatic)
- Duration: 600ms with stagger delays
- IntersectionObserver (not scroll events)

### Scroll-Driven Parallax ← Plans_1
- Background layers move slowest
- Content at normal speed
- Floating ornaments faster
- Uses `@scroll-timeline` with JS fallback

### `timeline-scope` for Synchronized Reveals ← Research
One scroll timeline orchestrates multiple child elements:
```css
.feature-section {
  timeline-scope: --cards;
}

@scroll-timeline --cards {
  source: selector(.feature-section);
}

.feature-card {
  animation: float-in 0.8s ease both;
  animation-timeline: --cards;
  animation-range: entry 10% exit 70%;
}
```

### `@starting-style` + `transition-behavior` ← Research
Animate elements entering DOM without JS class toggles:
```css
.toast {
  opacity: 1;
  transform: translateY(0);
  transition: opacity 400ms, transform 400ms, display 400ms;
  transition-behavior: allow-discrete;
}

.toast[hidden] {
  display: none;
  opacity: 0;
  transform: translateY(12px);
}

@starting-style {
  .toast { opacity: 0; transform: translateY(12px); }
}
```

### View Transitions API ← Research (Promoted from Deferred)
Seamless page-to-page navigation:
```javascript
if (document.startViewTransition) {
  document.startViewTransition(() => navigateTo(url));
}
```
```css
.hero-card { view-transition-name: hero-card; }

::view-transition-old(hero-card),
::view-transition-new(hero-card) {
  border-radius: var(--radius-lg);
}
```

---

## Component Transformations

### Header ← Plans_3
- Floating glass bar with edge-to-edge blur
- Logo with soft glow halo
- Nav items fade/scale on hover
- Subtle shadow below for separation

### Hero Section ← Plans_3 + Plans_1
- Massive headline with subtle gradient text
- Floating glass card for primary CTA
- Caustic ripples in background
- LED-style status badges (from Plans_1) for metrics
- Badge/stamp becomes floating ornament

### Feature Cards ← Plans_3
- Multi-layer glass effect
- Icon with soft glow background
- Hover reveals inner luminance
- Staggered reveal on scroll

### CTA Sections ← Plans_3
- Glass containers with edge luminance
- Primary button with gradient glow
- Secondary elements recede in depth

### Footer ← Plans_3
- Glass surface with reduced opacity
- Links grouped in floating sub-panels
- Cursor aurora continues

---

## Deferred Ideas (Future Enhancement)

These are great ideas to add after core rebuild:

| Idea | Source | Notes |
|------|--------|-------|
| Bill Splitting Console Window | Plans_1 | Interactive demo preview |
| Timeline Rail | Plans_1 | Scroll progress + navigation |
| Scrollytelling Segments | Plans_1/2 | Narrative feature reveals |
| Variable Font Weight Morphing | Plans_3 | Sophisticated text hover |

*(View Transitions moved to core implementation)*

---

## Files to Modify

### Core Styles
| File | Changes |
|------|---------|
| `src/styles/tokens.css` | New palette, motion tokens |
| `src/styles/global.css` | Glass utilities, caustic bg, cursor aurora |
| `src/styles/layout.css` | Header/footer glass, parallax setup |

### Components
| File | Changes |
|------|---------|
| `src/components/BaseLayout.astro` | Cursor aurora, parallax container |
| `src/components/ParticleStarfield.astro` | Replace → CausticRipples |
| `src/components/GlowingConnections.astro` | Remove (caustics replace) |
| `src/components/EasterEggs.astro` | Restyle with violet/cyan/pearl |

### Pages
| File | Changes |
|------|---------|
| `src/pages/index.astro` | Apply glass layers |
| `src/pages/pricing.astro` | Glass card treatment |
| `src/pages/[locale]/index.astro` | Same as index |

---

## Implementation Phases

### Phase 1: Foundation
- [ ] Lighten base colors (keep green, lift darkness)
- [ ] Add `color-mix()` utilities for semantic blending
- [ ] Typography updates (weights, letter-spacing)
- [ ] Fluid spacing with `clamp()` (e.g., `padding: clamp(1.5rem, 4vw, 3rem)`)
- [ ] Motion tokens (calm easings, slow durations)
- [ ] Keep brand accent colors (green/teal/amber)

### Phase 2: Caustic Ripples Background
- [ ] Canvas-based Perlin noise caustic effect
- [ ] Green/teal/amber color scheme (brand colors)
- [ ] 15-20s organic animation cycle
- [ ] Reduced motion fallback (static gradient)

### Phase 3: Glass System
- [ ] `.glass` utility with layer variants
- [ ] Context-aware blur (heavy for hero, matte for secondary)
- [ ] Edge luminance borders (`border-image` gradients)
- [ ] Edge highlights via `mask-image: radial-gradient()`
- [ ] Breathing animation (6-8s pulse)
- [ ] `@supports` fallback for no backdrop-filter

### Phase 4: Cursor Aurora
- [ ] Mouse tracking with smooth interpolation
- [ ] 400px radial gradient element
- [ ] Iridescent color shift
- [ ] Touch device detection (disable)

### Phase 5: Components
- [ ] Header glass treatment + navigation chroma
- [ ] Hero section (gradient text, floating CTA, LED badges)
- [ ] Feature cards with layers + `timeline-scope` sync
- [ ] CTA sections with edge luminance
- [ ] Footer redesign

### Phase 6: Motion Polish
- [ ] Scroll reveal (fade + blur clear)
- [ ] Scroll-driven parallax with `@scroll-timeline`
- [ ] 2px lift + glow hovers
- [ ] Staggered reveals
- [ ] `@starting-style` for toast/modal entry animations
- [ ] `transition-behavior: allow-discrete` for show/hide
- [ ] View Transitions API for page navigation

### Phase 7: Easter Eggs Restyle
- [ ] Confetti → green/teal/amber (brand colors)
- [ ] Secret popups → glass treatment with mint tint
- [ ] Disco mode → forest hue range
- [ ] Keep all functionality

### Phase 8: Accessibility & Performance
- [ ] Runtime `prefers-reduced-motion` listener
- [ ] WCAG 4.5:1 contrast verification
- [ ] 60fps animation testing
- [ ] Lighthouse 90+ audit
- [ ] Pointer-events guards on pseudo-elements

### Phase 9: QA & Cleanup
- [ ] Cross-browser testing
- [ ] Remove unused old styles
- [ ] Final visual review
- [ ] Update documentation

---

## Technical Notes

### Browser Support
- `backdrop-filter`: 94% — fallback to opaque bg
- `@scroll-timeline`: Chrome/Edge/Safari 17.4+ — JS fallback
- `@starting-style`: Chrome 117+, Safari 17.4+ — graceful degradation
- `transition-behavior`: Chrome 117+, Safari 17.4+ — fallback to instant
- `View Transitions`: Chrome 111+, Safari TP — feature-detect
- `color-mix()`: 91% — fallback to static colors
- `timeline-scope`: Chrome 116+ — fallback to individual timelines
- IntersectionObserver: 97%
- Canvas 2D: 99%

### Performance Budget
- CSS < 50KB compressed
- 60fps on all animations
- Lighthouse 90+
- Only animate `transform` and `opacity`

### Accessibility Requirements
- All effects respect `prefers-reduced-motion`
- **Runtime motion listener** — responds to preference changes mid-session:
  ```javascript
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  motionQuery.addEventListener('change', (e) => {
    document.body.classList.toggle('reduce-motion', e.matches);
  });
  ```
- Maintain 4.5:1 contrast minimum
- Focus states visible through glass
- No flashing or rapid motion
- Pointer-events guards on all decorative pseudo-elements

---

## Mood

*"Premium tech product launch — Apple keynote meets enchanted forest pool"*

Calm. Floating. Ethereal. Premium. **Green.**

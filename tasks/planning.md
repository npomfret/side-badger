# Side Badger - Website Planning Document

## Project Overview
A static marketing website for "Side Badger" - a slightly silly, totally free, no-tracking, no-ads white label implementation of a bill splitter / expense tracking web app.

**App URL:** app.sidebadger.com
**Website URL:** sidebadger.com
**Website purpose:** Marketing/landing page that drives users to the app

---

## DECISIONS MADE

| Decision | Choice |
|----------|--------|
| **Theme** | Cosmic Badger (aurora gradients, space, glassmorphism) |
| **Tone** | Chaotic Good (maximum whimsy, surprise interactions) |
| **Languages** | English only (i18n ready for future) |
| **Assets** | User has logo/mascot ready |
| **Hosting** | Self-hosted Docker on sidebadger.com server |
| **Fun features** | Particle starfield, confetti, cursor effects |
| **Legal content** | Placeholders for now (API later) |

---

## Pages Required

| Page | Content Source | Notes |
|------|---------------|-------|
| Home | Custom | Hero, features, CTA to launch app |
| Pricing | Custom | It's FREE! Make this fun/silly |
| Privacy Policy | API (markdown) | Fetch from white label app API |
| Terms & Conditions | API (markdown) | Fetch from white label app API |
| Cookies Policy | API (markdown) | Fetch from white label app API |

---

## Technical Requirements

### Static Site + Multi-language
- Must be static for SEO/indexability
- Multi-language support (matching the app)
- Generate locale-specific versions at build time

### Recommended Framework: **Astro**

**Why Astro:**
- Built-in i18n routing (since v4.0) - [Astro i18n Docs](https://docs.astro.build/en/guides/internationalization/)
- Zero JS by default (ships pure HTML)
- Excellent static site generation
- Can fetch API content at build time
- Component islands for interactive bits
- File-based routing with `/[locale]/` folders

**i18n Options:**
1. **Astro's built-in i18n** - Simple, no dependencies
2. **astro-i18next** - If you need more complex translation features
3. **Paraglide** - Newer, optimized bundles (recommended for Astro 5)

---

## Design Direction Options

### Option A: "Cosmic Badger" (Aurora + Space Theme)
- Deep purple/blue aurora gradient backgrounds (animated over 24s)
- Stars/particles floating in background
- Glassmorphism cards
- Badger mascot floating through space
- Silly tagline: *"Badgering your bills into submission"*

### Option B: "Forest Badger" (Nature + Whimsy)
- Organic shapes, earth tones with teal accents
- Animated forest/grass elements
- Cartoon badger digging through receipts
- Silly tagline: *"Dig into your expenses"*

### Option C: "Neon Badger" (Retro-Futurism)
- Cyberpunk neon colors (pink, cyan, purple)
- Glitch effects, scan lines
- 80s retro grid background
- Badger with sunglasses
- Silly tagline: *"The future of free bill splitting"*

### Option D: "Corporate Badger" (Anti-corporate satire)
- Looks corporate but with absurd copy
- Stock photo parody style
- Badger in a suit
- Silly tagline: *"Synergizing your expense paradigms"*

---

## Modern UI Features to Implement

Based on research from [2025 UI trends](https://blog.depositphotos.com/web-design-trends-2025.html) and the UI/UX guide:

### Must-Have
- [ ] **Aurora gradient backgrounds** - Animated, slow-moving (20-30s)
- [ ] **Glassmorphism cards** - `backdrop-filter: blur(24px)`
- [ ] **Bento grid layout** - Modular, Japanese lunch box inspired
- [ ] **Fluid typography** - Using `clamp()` for responsive text
- [ ] **Scroll-triggered reveals** - Using IntersectionObserver
- [ ] **CSS custom properties** - Design tokens for theming
- [ ] **prefers-reduced-motion** - Accessibility compliance

### Fun Additions (Pick some)
- [ ] **Confetti on CTA click** - Using [canvas-confetti](https://github.com/catdad/canvas-confetti) or [js-confetti](https://www.npmjs.com/package/js-confetti)
- [ ] **Particle background** - Using [tsParticles](https://particles.js.org/)
- [ ] **Animated badger mascot** - CSS/Lottie animation
- [ ] **Easter eggs** - Konami code, click sequences
- [ ] **Cursor trails/effects** - Sparkles following cursor
- [ ] **Sound effects** - Optional, toggle-able
- [ ] **Dark/light mode** - With silly theme names

---

## Content Ideas

### Home Page Sections
1. **Hero** - Big headline, animated badger, "Launch App" CTA
2. **What is Side Badger?** - Brief explainer with bento cards
3. **Features** - Icon grid or feature cards
4. **Why Free?** - Playful explanation (it's a demo!)
5. **No Tracking Promise** - Privacy-focused messaging
6. **CTA Footer** - Final push to launch app

### Pricing Page Ideas (Make it silly!)
- Single "plan" called something like "The Full Badger"
- Fake "crossed out" premium price ($999/month) with FREE underneath
- Feature comparison table where everything is checkmarks
- "Enterprise" tier that's just "Call us... for a chat about badgers"
- Confetti explosion when they realize it's free

### Legal Pages
- Clean, readable markdown rendering
- Fetched from API at build time
- Placeholder during dev: "This content will be loaded from the app"

---

## 3rd Party APIs & Libraries to Consider

### Visual Effects
| Library | Purpose | Size |
|---------|---------|------|
| [canvas-confetti](https://github.com/catdad/canvas-confetti) | Celebration effects | ~5KB |
| [tsParticles](https://particles.js.org/) | Particle backgrounds | ~30KB |
| [Lottie](https://lottiefiles.com/) | Vector animations | ~50KB |
| [GSAP](https://greensock.com/gsap/) | Animation library | ~60KB |

### Icons
- [Lucide](https://lucide.dev/) - Clean, modern icons
- [Heroicons](https://heroicons.com/) - Tailwind-style icons
- [Phosphor](https://phosphoricons.com/) - Flexible icon family

### Fonts
- Inter, Plus Jakarta Sans, or Space Grotesk for modern feel
- Add a playful display font for headlines

### Content APIs
- **White label app API** - For legal content (privacy, terms, cookies)
- **Random badger facts API?** - For fun footer content

---

## Deployment Architecture

### Server Setup
- **Server:** sidebadger.com (SSH: `root@sidebadger.com`)
- **Pattern:** Docker containers behind shared nginx reverse proxy
- **Proxy:** snowmonkey-proxy-network (existing infrastructure)

### What We'll Create
```
/opt/side-badger-website/
├── docker-compose.yml      # Nginx serving static files
├── Dockerfile              # Multi-stage: build Astro → serve with nginx
└── dist/                   # Built static files (generated)
```

### Nginx Proxy Config (to add to snowmonkey-proxy-common)
```nginx
# sidebadger.com - HTTP redirect
server {
    listen 80;
    server_name sidebadger.com www.sidebadger.com;

    location /.well-known/acme-challenge/ {
        root /var/www/letsencrypt;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# sidebadger.com - HTTPS
server {
    listen 443 ssl http2;
    server_name sidebadger.com www.sidebadger.com;

    ssl_certificate /etc/letsencrypt/live/sidebadger.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/sidebadger.com/privkey.pem;
    # ... standard SSL config ...

    location / {
        proxy_pass http://side-badger-website:80;
        # ... standard proxy headers ...
    }
}
```

### Deployment Script
Similar to existing pattern:
1. Build Astro site locally
2. SCP files to server
3. Docker build & up

---

## Questions - ANSWERED

| Question | Answer |
|----------|--------|
| Theme direction | Cosmic Badger |
| Mascot/logo | User has assets |
| Languages | English only (for now) |
| API endpoint | Provide later, use placeholders |
| Hosting | Self-hosted Docker (root@sidebadger.com) |
| Silliness level | 10/10 - Chaotic Good |
| Features wanted | Particle starfield, confetti, cursor effects |

---

## Next Steps

1. Set up Astro project with i18n
2. Create design tokens and base styles
3. Build component library (buttons, cards, etc.)
4. Implement pages
5. Add animations and effects
6. Connect to API for legal content
7. Test across browsers and devices
8. Deploy

---

## Research Sources

- [Design Trends 2025](https://blog.depositphotos.com/web-design-trends-2025.html)
- [UI Design Trends 2025](https://solguruz.com/blog/ui-ux-design-trends/)
- [Glassmorphism Guide](https://www.designstudiouiux.com/blog/what-is-glassmorphism-ui-trend/)
- [Astro i18n Docs](https://docs.astro.build/en/guides/internationalization/)
- [canvas-confetti](https://github.com/catdad/canvas-confetti)
- [tsParticles](https://particles.js.org/)
- Internal: modern_ui_ux_guide.md (comprehensive implementation reference)

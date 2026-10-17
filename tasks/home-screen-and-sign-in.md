# Home screen and sign-in (October 2026)

Branch `sign-in-and-home-screen`.

## Problem

The app (`app.sidebadger.me`) is an installable web app; this site is a separate origin. The site
shipped its own `manifest.json` (`display: standalone`, `start_url: /`, the app's name and icon), and
its copy told readers to "add Side Badger to your home screen". A phone user reading that on
sidebadger.me adds the marketing site: a fake "app" that opens the brochure full-screen. Returning
users on phones also had no labelled way to sign in (the header collapsed to an unlabelled icon).

## Decisions

1. **Sign in is labelled where phone users look.** Hero: "Already have an account? Sign in"; the top of
   the Menu panel: a labelled Sign in button; header: "Sign in" (icon only under 640px, because a
   labelled button pushed Menu off the bar in about half the locales at 320-375px). All go through
   `/go/app/` (`cta` = `hero-sign-in`, `menu`, `header`). Done in `962ddd3`.
2. **The site is not installable.** `public/manifest.json` and its `<link>` are removed; the favicon and
   `apple-touch-icon` stay, so a home-screen shortcut to the site is an ordinary bookmark with our icon.
   Rejected: keeping a manifest with `start_url: /go/app/` (installs a shell that bounces to another
   origin, which opens in an in-app browser sheet; Chrome would also offer to "install" the brochure).
   Rejected: serving the app and site on one origin (large change for this problem alone).
3. **Install happens in the app.** The copy now says: sign in, then add Side Badger to your home screen;
   Settings in the app shows how (the app's `InstallAppSection`). Rich text never links to the app.
4. **Recommendation for `wl-bill-splitter` (not this repo):** offer installation inside the app after
   sign-in (Android `beforeinstallprompt`, an iOS "Share, Add to Home Screen" hint), and fix its
   manifest icons (one `.jpg` labelled `image/png`, no 192px size).

## Translation work

English changed in `pages/how-it-works/en.yaml` (requirements item 4, FAQ "Is there an app?") and
`pages/features/en.yaml` (the "Home screen" item, the "Ship a native app" item, FAQ "Is there a mobile
app?"). Each change adds one idea: sign in first, then add it from the app, where Settings shows how.

Per locale (both entries):
1. Edit only the changed strings, keeping the rest of the translation and the locale's terms (its word
   for "sign in" must match `header.signIn` in `src/i18n/<locale>.ts`; "Settings" should match how the
   locale already names the app's settings, if it does).
2. Set `review` to `status: machine` (drop `checker` and `date`).
3. `npm run i18n -- content-lock <locale> pages/how-it-works` and `... pages/features`.

Then an independent back-check per locale: `backcheck <locale> pages/how-it-works` and
`pages/features`, plus the shell and home keys added in `962ddd3` (`header.signIn`,
`home.hero.haveAccount`); record `--pass --checker HS-check` only after fixing any problem.

Groups: A `ar bn cs cy da de el es eu fa`; B `fi fr ga hi hr hu id is it ja`;
C `ko lv nl-BE no pcm ph pl pt ro sl`; D `sr sv sw te tr uk ur zh`.

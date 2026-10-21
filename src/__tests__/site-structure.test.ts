import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  ensureTrailingSlash,
  getLocalizedPath,
  isRTL,
  localeAliases,
  localeConfig,
  localeForBrowserLanguage,
  locales,
  pseudoLocales,
  t,
  tf,
  translations,
  type Locale,
} from '@/i18n';
import { pseudoText } from '@/i18n/pseudo';
import en from '@/i18n/en';
import { pages, allPages } from '@/site/pages';
import { pageForPath } from '@/site/routes';
import { absoluteUrl, canonicalFor, launchHref, localizedPath } from '@/seo/urls';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  vi.doUnmock('@/i18n/pending/keys.json');
  vi.doUnmock('@/i18n/pending/pages.json');
  vi.doUnmock('@/i18n/en');
  vi.doUnmock('@/site/preview-pages');
});

describe('page registry', () => {
  it('has unique ids and unique paths', () => {
    const ids = pages.map(p => p.id);
    const paths = pages.map(p => p.path);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('uses slash-terminated English paths', () => {
    for (const page of pages) {
      expect(page.path, page.id).toMatch(/^\/([a-z0-9-]+\/)*$/);
    }
  });

  it('keeps top-level slugs disjoint from locale codes, aliases and pseudo-locale codes', () => {
    // [...locale] would otherwise read /fr/ as the page fr, or the page features as a locale
    const reserved = new Set(
      [...Object.keys(localeConfig), ...localeAliases].map(code => code.toLowerCase())
    );
    for (const page of allPages()) {
      const [slug] = page.path.split('/').filter(Boolean);
      if (slug) expect(reserved.has(slug.toLowerCase()), `${page.id} (${page.path})`).toBe(false);
    }
  });

  it('keeps top-level slugs clear of the paths nginx and Astro own', () => {
    const owned = new Set(['go', 'og', '_astro', 'health', 'flags', 'images', 'fonts']);
    for (const page of allPages()) {
      const [slug] = page.path.split('/').filter(Boolean);
      if (slug) expect(owned.has(slug), page.id).toBe(false);
    }
  });

  it('only names parents that exist, and never itself', () => {
    const ids = new Set(allPages().map(p => p.id));
    for (const page of allPages()) {
      if (page.parent) {
        expect(ids.has(page.parent), `${page.id} -> ${page.parent}`).toBe(true);
        expect(page.parent).not.toBe(page.id);
      }
    }
  });

  it('registers the five current pages and the release 1 pages', () => {
    expect(pages.map(p => p.id)).toEqual(
      expect.arrayContaining([
        'home',
        'pricing',
        'privacy',
        'terms',
        'cookies',
        'how-it-works',
        'features',
        'feature/split-expenses',
        'feature/settle-up',
        'feature/multiple-currencies',
        'use-cases',
        'use-case/group-trips',
        'use-case/housemates',
        'use-case/events-and-celebrations',
      ])
    );
  });
});

describe('locale metadata (D5, D35)', () => {
  it('maps ph to lang fil and hreflang tl', () => {
    expect(localeConfig.ph.htmlLang).toBe('fil');
    expect(localeConfig.ph.hreflang).toBe('tl');
    expect(localeConfig.ph.ogLocale).toBe('fil_PH');
    expect(localeConfig.ph.browserLanguages).toEqual(['fil', 'tl']);
  });

  it('applies the other overrides from section 2.4', () => {
    expect(localeConfig.zh).toMatchObject({ htmlLang: 'zh-Hans', hreflang: 'zh', ogLocale: 'zh_CN', browserLanguages: ['zh'] });
    expect(localeConfig.no).toMatchObject({ htmlLang: 'no', hreflang: 'no', ogLocale: 'nb_NO', browserLanguages: ['no', 'nb', 'nn'] });
    expect(localeConfig['nl-BE']).toMatchObject({ htmlLang: 'nl-BE', hreflang: 'nl-BE', ogLocale: 'nl_BE', browserLanguages: ['nl'] });
    expect(localeConfig.pcm).toMatchObject({ htmlLang: 'pcm', hreflang: 'pcm', ogLocale: 'en_NG', dir: 'ltr' });
    expect(localeConfig.ar.ogLocale).toBe('ar_EG');
    expect(localeConfig.en).toMatchObject({ htmlLang: 'en', hreflang: 'en', ogLocale: 'en_US', browserLanguages: ['en'] });
  });

  it('defaults every other tag to the locale code', () => {
    const special = new Set(['ph', 'zh', 'no', 'nl-BE']);
    for (const locale of locales.filter(l => !special.has(l))) {
      const config = localeConfig[locale];
      expect(config.htmlLang, locale).toBe(locale);
      expect(config.hreflang, locale).toBe(locale);
      expect(config.browserLanguages, locale).toEqual([locale]);
      expect(config.ogLocale, locale).toBe(config.intlCode.replace('-', '_'));
    }
  });

  it('is right-to-left for exactly ar, fa and ur', () => {
    expect(locales.filter(l => localeConfig[l].dir === 'rtl').sort()).toEqual(['ar', 'fa', 'ur']);
    expect(isRTL('ar')).toBe(true);
    expect(isRTL('ur')).toBe(true);
    expect(isRTL('he')).toBe(false);
    expect(isRTL('fr')).toBe(false);
    expect(isRTL('xx-ar')).toBe(true);
  });

  it('gives each locale a fontScript', () => {
    const scripts = {
      latin: ['en', 'cs', 'cy', 'da', 'de', 'es', 'eu', 'fi', 'fr', 'ga', 'hr', 'hu', 'id', 'is', 'it', 'lv', 'nl-BE', 'no', 'pcm', 'ph', 'pl', 'pt', 'ro', 'sl', 'sv', 'sw', 'tr'],
      'cyrillic-greek': ['el', 'sr', 'uk'],
      arabic: ['ar', 'fa', 'ur'],
      devanagari: ['hi'],
      bengali: ['bn'],
      telugu: ['te'],
      cjk: ['ja', 'ko', 'zh'],
    };
    const expected = Object.entries(scripts).flatMap(([script, list]) => list.map(l => [l, script]));
    expect(expected.length).toBe(locales.length);
    for (const [locale, script] of expected) {
      expect(localeConfig[locale as Locale].fontScript, locale).toBe(script);
    }
  });

  it('matches browser languages (nl to nl-BE, nb to no, fil to ph)', () => {
    expect(localeForBrowserLanguage('nl-NL')).toBe('nl-BE');
    expect(localeForBrowserLanguage('nb')).toBe('no');
    expect(localeForBrowserLanguage('fil')).toBe('ph');
    expect(localeForBrowserLanguage('zh-TW')).toBe('zh');
    expect(localeForBrowserLanguage('en-GB')).toBe('en');
    expect(localeForBrowserLanguage('xx')).toBeUndefined();
  });

  it('keeps the pseudo-locales out of the real locale list', () => {
    expect(locales.length).toBe(39);
    for (const code of pseudoLocales) expect(locales as string[]).not.toContain(code);
    expect(localeConfig['xx-ar']).toMatchObject({ htmlLang: 'ar', dir: 'rtl', fontScript: 'arabic' });
    expect(localeConfig['xx-ja']).toMatchObject({ htmlLang: 'ja', dir: 'ltr', fontScript: 'cjk' });
    expect(localeConfig['xx-hi']).toMatchObject({ htmlLang: 'hi', dir: 'ltr', fontScript: 'devanagari' });
  });
});

describe('URL helpers (D1, D3)', () => {
  it('always returns the slash form', () => {
    expect(getLocalizedPath('/', 'en')).toBe('/');
    expect(getLocalizedPath('/', 'fr')).toBe('/fr/');
    expect(getLocalizedPath('/pricing', 'fr')).toBe('/fr/pricing/');
    expect(getLocalizedPath('/pricing/', 'fr')).toBe('/fr/pricing/');
    expect(getLocalizedPath('/pricing/#faq', 'ph')).toBe('/ph/pricing/#faq');
    expect(getLocalizedPath('/pricing?x=1', 'en')).toBe('/pricing/?x=1');
  });

  it('replaces any existing locale or alias prefix', () => {
    expect(getLocalizedPath('/en-gb/pricing', 'en')).toBe('/pricing/');
    expect(getLocalizedPath('/en-gb', 'de')).toBe('/de/');
    expect(getLocalizedPath('/nl-NL/terms/', 'nl-BE')).toBe('/nl-BE/terms/');
    expect(getLocalizedPath('/fr/pricing/', 'de')).toBe('/de/pricing/');
  });

  it('leaves file paths alone', () => {
    expect(ensureTrailingSlash('/sitemap-index.xml')).toBe('/sitemap-index.xml');
    expect(ensureTrailingSlash('')).toBe('/');
  });

  it('builds localized paths from ids or paths', () => {
    expect(localizedPath('home', 'en')).toBe('/');
    expect(localizedPath('home', 'fr')).toBe('/fr/');
    expect(localizedPath('pricing', 'en')).toBe('/pricing/');
    expect(localizedPath('pricing', 'ph')).toBe('/ph/pricing/');
    expect(localizedPath('/terms', 'nl-BE')).toBe('/nl-BE/terms/');
    expect(() => localizedPath('nope', 'en')).toThrow(/Unknown page id/);
  });

  it('builds absolute and canonical URLs', () => {
    expect(absoluteUrl('/pricing/')).toBe('https://sidebadger.me/pricing/');
    expect(canonicalFor('pricing', 'fr')).toBe('https://sidebadger.me/fr/pricing/');
    expect(canonicalFor('home', 'en')).toBe('https://sidebadger.me/');
  });

  it('gives every registered page a slash-form path in every locale', () => {
    for (const page of pages) {
      for (const locale of locales) {
        expect(localizedPath(page.id, locale), `${page.id} ${locale}`).toMatch(/\/$/);
      }
    }
  });
});

describe('launchHref (D28)', () => {
  const nginx = readFileSync(resolve(__dirname, '../../nginx/default.conf'), 'utf8');

  it('builds /go/app/ and /go/register/ links with from, cta and lang', () => {
    expect(launchHref('home', 'en', { cta: 'hero' })).toBe('/go/app/?from=home&cta=hero');
    expect(launchHref('pricing', 'fr', { target: 'register', cta: 'footer-cta' })).toBe(
      '/go/register/?from=pricing&cta=footer-cta&lang=fr'
    );
    expect(launchHref('feature/settle-up', 'nl-BE', { target: 'register', cta: 'hero' })).toBe(
      '/go/register/?from=feature/settle-up&cta=hero&lang=nl-BE'
    );
    expect(launchHref('home', 'en')).toBe('/go/app/?from=home&cta=link');
  });

  it('never passes a pseudo-locale on as lang', () => {
    expect(launchHref('home', 'xx-ar', { cta: 'hero' })).not.toContain('lang=');
  });

  it('matches the locations and log fields in nginx/default.conf', () => {
    expect(nginx).toMatch(/location = \/go\/app\/ \{/);
    expect(nginx).toMatch(/location = \/go\/register\/ \{/);
    for (const field of ['arg_from', 'arg_cta', 'arg_lang']) expect(nginx).toContain(`$${field}`);
    for (const locale of locales.filter(l => l !== 'en')) {
      const href = launchHref('home', locale, { cta: 'x' });
      const lang = new URL(href, 'https://sidebadger.me').searchParams.get('lang');
      expect(lang, locale).toBe(locale);
      // the nginx lang map accepts exactly this value
      expect(nginx, locale).toMatch(new RegExp(`[(|]${locale}[|)]`));
    }
  });
});

describe('tf (D13)', () => {
  it('fills {placeholders} and leaves other text alone', () => {
    const key = Object.keys(en).find(k => /\{\w+\}/.test((en as Record<string, string>)[k]));
    // The English file has no placeholder strings until the homepage keys land
    if (!key) return;
    const value = (en as Record<string, string>)[key];
    const names = [...value.matchAll(/\{(\w+)\}/g)].map(m => m[1]);
    const params = Object.fromEntries(names.map(n => [n, `<${n}>`]));
    expect(tf(key as keyof typeof en, params)).not.toMatch(/\{\w+\}/);
  });

  it('throws on a missing value instead of shipping a raw token', () => {
    const key = 'header.logoText' as const;
    const table = en as Record<string, string>;
    const original = table[key];
    table[key] = '{a} owes {b}';
    try {
      expect(tf(key, { a: 'Ava', b: 'Ben' })).toBe('Ava owes Ben');
      expect(tf(key, { a: 1, b: 2 })).toBe('1 owes 2');
      expect(() => tf(key, { a: 'Ava' })).toThrow(/no value for \{b\}/);
    } finally {
      table[key] = original;
    }
  });

  it('falls back like t() for plain strings', () => {
    expect(tf('header.logoText', {})).toBe(t('header.logoText'));
  });
});

// Route generation must not depend on the repo's current manifests or on English keys that no
// locale has yet (the redesign branch's English-first state, D38). Each test loads fresh copies of
// the modules with the manifests mocked and English cut to the keys every locale has.
type Manifests = { keys?: string[]; pages?: string[]; previewPages?: unknown[]; en?: Record<string, string> };

async function loadFresh({ keys = [], pages: pendingPages = [], previewPages, en: enOverride }: Manifests = {}) {
  const english = en as Record<string, string>;
  const common = Object.keys(english).filter(key =>
    Object.values(translations).every(table => key in (table as Record<string, string>))
  );
  vi.resetModules();
  vi.doMock('@/i18n/pending/keys.json', () => ({ default: { added: keys, removed: [] } }));
  vi.doMock('@/i18n/pending/pages.json', () => ({ default: { added: pendingPages } }));
  vi.doMock('@/i18n/en', () => ({
    default: enOverride ?? Object.fromEntries(common.map(key => [key, english[key]])),
  }));
  if (previewPages) vi.doMock('@/site/preview-pages', () => ({ previewPages }));
  const i18n = await import('@/i18n');
  const routes = await import('@/site/routes');
  const registry = await import('@/site/pages');
  return { i18n, routes, registry };
}

describe('route generation', () => {
  const localeParams = (paths: { params: { locale: string | undefined } }[]) =>
    paths.map(p => p.params.locale ?? 'en');

  it('builds every real locale in strict mode, and no alias', async () => {
    vi.stubEnv('I18N_MODE', 'strict');
    const { i18n, routes } = await loadFresh();
    const paths = routes.pathsFor('home');
    expect(paths).toHaveLength(39);
    expect(localeParams(paths).sort()).toEqual([...locales].sort());
    for (const alias of localeAliases) expect(localeParams(paths)).not.toContain(alias);
    expect(paths.find(p => p.props.locale === 'en')!.params.locale).toBeUndefined();
    expect(i18n.getLocalePaths()).toHaveLength(39);
  });

  it('builds 39 × 32 pages in strict mode (including support and release 2)', async () => {
    vi.stubEnv('I18N_MODE', 'strict');
    const { routes, registry } = await loadFresh();
    const total = registry.pages.reduce((sum, page) => sum + routes.pathsFor(page.id).length, 0);
    expect(total).toBe(39 * 32);
    expect(routes.pathsFor('support')).toHaveLength(39);
    expect(routes.pathsForType('legal')).toHaveLength(39 * 3);
    expect(routes.pathsForType('home')).toHaveLength(39);
    expect(routes.pathsForType('pricing')).toHaveLength(39);
  });

  it('adds the four pseudo prefixes under PREVIEW_PSEUDO=1', async () => {
    vi.stubEnv('PREVIEW_PSEUDO', '1');
    const { i18n, routes } = await loadFresh();
    const built = localeParams(routes.pathsFor('pricing'));
    expect(built).toHaveLength(43);
    for (const code of pseudoLocales) expect(built).toContain(code);
    expect(i18n.getBuildLocales()).toHaveLength(43);
  });

  it('rejects an invalid I18N_MODE', async () => {
    vi.stubEnv('I18N_MODE', 'loose');
    const { i18n } = await loadFresh();
    expect(() => i18n.getBuildLocales()).toThrow(/I18N_MODE/);
  });

  it('English-first with nothing pending still builds every complete locale', async () => {
    vi.stubEnv('I18N_MODE', 'english-first');
    const { i18n } = await loadFresh();
    expect(i18n.getBuildLocales()).toHaveLength(39);
  });

  it('English-first builds English only when a pending key is missing from every locale', async () => {
    vi.stubEnv('I18N_MODE', 'english-first');
    const { i18n, routes } = await loadFresh({ keys: ['scratch.new.key'] });
    expect(i18n.getBuildLocales()).toEqual(['en']);
    for (const id of ['home', 'pricing', 'privacy', 'terms', 'cookies']) {
      const paths = routes.pathsFor(id);
      expect(paths, id).toHaveLength(1);
      expect(paths[0].params.locale).toBeUndefined();
    }
    expect(i18n.getLocalePaths()).toEqual([{ params: { locale: undefined } }]);
    // strict mode ignores the manifest: the tests enforce that it is empty there
    vi.stubEnv('I18N_MODE', 'strict');
    expect(i18n.getBuildLocales()).toHaveLength(39);
  });

  it('English-first skips exactly the locales missing a pending key that English has', async () => {
    const key = 'zz.scratch';
    const english = en as Record<string, string>;
    const common = Object.keys(english).filter(k =>
      Object.values(translations).every(table => k in (table as Record<string, string>))
    );
    const scratchEn = { ...Object.fromEntries(common.map(k => [k, english[k]])), [key]: 'Scratch' };
    const { i18n, routes } = await loadFresh({ en: scratchEn });
    const french = i18n.translations.fr as Record<string, string>;
    french[key] = 'Brouillon';
    try {
      vi.stubEnv('I18N_MODE', 'english-first');
      expect(i18n.getBuildLocales()).toEqual(['en', 'fr']);
      expect(routes.pathsFor('pricing').map(p => p.params.locale ?? 'en')).toEqual(['en', 'fr']);
      // strict mode builds every locale: the translation tests are what fail there
      vi.stubEnv('I18N_MODE', 'strict');
      expect(i18n.getBuildLocales()).toHaveLength(39);
    } finally {
      delete french[key];
    }
  });

  it('skips a page/locale pair that lacks its content entry in English-first mode only', async () => {
    const preview = {
      id: 'feature/scratch',
      type: 'feature',
      path: '/features/scratch/',
      published: true,
      locales: 'all',
      content: { collection: 'featurePages', slug: 'scratch-no-such-slug' },
      indexing: 'per-locale-review',
    };
    vi.stubEnv('PREVIEW_UNPUBLISHED', '1');
    const { routes } = await loadFresh({ previewPages: [preview], pages: ['feature/scratch'] });

    vi.stubEnv('I18N_MODE', 'english-first');
    const paths = routes.pathsFor('feature/scratch');
    expect(paths.map(p => p.params.locale)).toEqual([undefined]);
    expect(paths[0].params.slug).toBe('scratch');

    vi.stubEnv('I18N_MODE', 'strict');
    expect(() => routes.pathsFor('feature/scratch')).toThrow(/no content entry/);
  });

  it('fails in English-first mode when a missing entry is not listed in pending/pages.json', async () => {
    const preview = {
      id: 'feature/unlisted',
      type: 'feature',
      path: '/features/unlisted/',
      published: true,
      locales: 'all',
      content: { collection: 'featurePages', slug: 'unlisted-no-such-slug' },
      indexing: 'per-locale-review',
    };
    vi.stubEnv('I18N_MODE', 'english-first');
    vi.stubEnv('PREVIEW_UNPUBLISHED', '1');
    const { routes } = await loadFresh({ previewPages: [preview] });
    expect(() => routes.pathsFor('feature/unlisted')).toThrow(/pending\/pages\.json/);
  });

  it('does not build an unpublished page unless PREVIEW_UNPUBLISHED=1', async () => {
    const draft = {
      id: 'draft-hub',
      type: 'hub',
      path: '/draft-hub/',
      published: false,
      locales: 'all',
      indexing: 'per-locale-review',
    };
    vi.stubEnv('I18N_MODE', 'strict');
    const { routes } = await loadFresh({ previewPages: [draft] });
    expect(routes.pathsFor('draft-hub')).toEqual([]);
    expect(routes.pathsForType('hub').filter(path => path.props.pageId === 'draft-hub')).toEqual([]);
    expect(routes.pathsForType('hub')).toHaveLength(39 * 3);
    vi.stubEnv('PREVIEW_UNPUBLISHED', '1');
    expect(routes.pathsFor('draft-hub')).toHaveLength(39);
  });

  it('maps URLs back to pages and locales, and knows no aliases', () => {
    expect(pageForPath('/')).toMatchObject({ page: { id: 'home' }, locale: 'en' });
    expect(pageForPath('/pricing/')).toMatchObject({ page: { id: 'pricing' }, locale: 'en' });
    expect(pageForPath('/fr/')).toMatchObject({ page: { id: 'home' }, locale: 'fr' });
    expect(pageForPath('/ph/terms/')).toMatchObject({ page: { id: 'terms' }, locale: 'ph' });
    expect(pageForPath('https://sidebadger.me/nl-BE/cookies/?x=1#a')).toMatchObject({
      page: { id: 'cookies' },
      locale: 'nl-BE',
    });
    expect(pageForPath('/en-gb/pricing/')).toBeUndefined();
    expect(pageForPath('/nl-NL/')).toBeUndefined();
    expect(pageForPath('/en/pricing/')).toBeUndefined();
    expect(pageForPath('/nope/')).toBeUndefined();
    // inherited object keys are not locale prefixes
    expect(pageForPath('/constructor/')).toBeUndefined();
    expect(pageForPath('/toString/pricing/')).toBeUndefined();
  });
});

describe('pseudo-locale text (D38)', () => {
  const sample = 'Split {count} bills with <strong>friends</strong> &amp; family';
  const PLAIN = 'Split  bills with friends family';

  it('makes xx-long about 40% longer, accented, with placeholders and markup intact', () => {
    const out = pseudoText(sample, 'xx-long');
    // 40% longer than the text a reader sees (placeholders and tags do not count)
    expect(out.length).toBeGreaterThanOrEqual(sample.length + Math.ceil(PLAIN.length * 0.4));
    expect(out).toContain('{count}');
    expect(out).toContain('<strong>');
    expect(out).toContain('&amp;');
    expect(out).toMatch(/[áéíóú]/);
  });

  it('keeps the English length in the script pseudo-locales', () => {
    for (const [code, script] of [
      ['xx-ar', /[؀-ۿ]/],
      ['xx-ja', /[぀-ヿ一-鿿]/],
      ['xx-hi', /[ऀ-ॿ]/],
    ] as const) {
      const out = pseudoText(sample, code);
      expect(out.length, code).toBe(sample.length);
      expect(out, code).toMatch(script);
      expect(out, code).toContain('{count}');
      expect(out, code).toContain('<strong>');
    }
  });

  it('serves pseudo text through t() and tf()', () => {
    expect(t('header.logoText', 'xx-ar')).not.toBe(t('header.logoText', 'en'));
    expect(t('header.logoText', 'xx-ar')).toMatch(/[؀-ۿ]/);
    expect(t('header.logoText', 'xx-long').length).toBeGreaterThan(t('header.logoText', 'en').length);
  });
});

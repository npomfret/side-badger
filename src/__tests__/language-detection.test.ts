import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { getFlagUrl, localeConfig, localeForBrowserLanguage, locales } from '@/i18n';

describe('browser language to locale (D5)', () => {
  it.each([
    ['nl', 'nl-BE'],
    ['nl-NL', 'nl-BE'],
    ['nb', 'no'],
    ['nn', 'no'],
    ['no', 'no'],
    ['fil', 'ph'],
    ['tl', 'ph'],
    ['zh-TW', 'zh'],
    ['pt-BR', 'pt'],
    ['en-GB', 'en'],
    ['FR-ca', 'fr'],
  ])('%s selects %s', (tag, expected) => {
    expect(localeForBrowserLanguage(tag)).toBe(expected);
  });

  it('returns nothing for an unsupported language', () => {
    expect(localeForBrowserLanguage('xx')).toBeUndefined();
    expect(localeForBrowserLanguage('')).toBeUndefined();
  });

  it('never selects an alias or pseudo-locale', () => {
    for (const locale of locales) {
      for (const tag of localeConfig[locale].browserLanguages) {
        expect(locales).toContain(localeForBrowserLanguage(tag));
      }
    }
  });
});

// Run the real inline script from LanguageDetection.astro against a fake browser.
const source = readFileSync(resolve(__dirname, '../components/LanguageDetection.astro'), 'utf8');
const scriptStart = source.indexOf('(function () {');
const scriptEnd = source.lastIndexOf('</script>');
if (scriptStart === -1 || scriptEnd < scriptStart) {
  throw new Error('LanguageDetection.astro: could not find the inline detection script to test');
}
const scriptBody = source.slice(scriptStart, scriptEnd);

function detect(opts: {
  currentLocale?: string;
  languages: string[];
  stored?: string;
  storageThrows?: boolean;
  pathname?: string;
  alternates?: Record<string, string>;
  tagTable?: Record<string, string>;
}) {
  const store = new Map<string, string>();
  if (opts.stored) store.set('preferred-locale', opts.stored);
  const localStorage = {
    getItem: (k: string) => {
      if (opts.storageThrows) throw new Error('blocked');
      return store.get(k) ?? null;
    },
    setItem: (k: string, v: string) => {
      if (opts.storageThrows) throw new Error('blocked');
      store.set(k, v);
    },
  };
  const pathname = opts.pathname ?? '/pricing/';
  const location = {
    href: `https://example.test${pathname}`,
    pathname,
    search: '?a=1',
    hash: '#h',
    origin: 'https://example.test',
    replaced: undefined as string | undefined,
    replace(url: string) {
      this.replaced = url;
    },
  };
  const links = Object.entries(opts.alternates ?? {}).map(([hreflang, href]) => ({
    href,
    getAttribute: (name: string) => (name === 'hreflang' ? hreflang : null),
  }));
  const document = { querySelectorAll: () => links };
  const navigator = { languages: opts.languages, language: opts.languages[0] };
  const tagTable = opts.tagTable ?? {
    nl: 'nl-BE', nb: 'no', nn: 'no', no: 'no', fil: 'ph', tl: 'ph', fr: 'fr', de: 'de', zh: 'zh',
  };
  const hreflangs: Record<string, string> = {
    'nl-BE': 'nl-BE', no: 'no', ph: 'tl', fr: 'fr', de: 'de', zh: 'zh',
  };
  new Function(
    'currentLocale', 'tagTable', 'hreflangs', 'localStorage', 'navigator', 'document', 'location', 'URL',
    scriptBody
  )(opts.currentLocale ?? 'en', tagTable, hreflangs, localStorage, navigator, document, location, URL);
  return { replaced: location.replaced, stored: store.get('preferred-locale') };
}

const alternates = {
  en: 'https://sidebadger.me/pricing/',
  fr: 'https://sidebadger.me/fr/pricing/',
  'nl-BE': 'https://sidebadger.me/nl-BE/pricing/',
  no: 'https://sidebadger.me/no/pricing/',
  tl: 'https://sidebadger.me/ph/pricing/',
};

describe('LanguageDetection script', () => {
  it('redirects an English page to the matching locale and keeps query and hash', () => {
    const result = detect({ languages: ['fr-CA', 'en'], alternates });
    expect(result.replaced).toBe('/fr/pricing/?a=1#h');
    expect(result.stored).toBe('fr');
  });

  it('maps nl to nl-BE, nb to no and fil to ph', () => {
    expect(detect({ languages: ['nl-NL'], alternates }).replaced).toBe('/nl-BE/pricing/?a=1#h');
    expect(detect({ languages: ['nb'], alternates }).replaced).toBe('/no/pricing/?a=1#h');
    expect(detect({ languages: ['fil'], alternates }).replaced).toBe('/ph/pricing/?a=1#h');
  });

  it('skips a language that was not built and uses the next one', () => {
    expect(detect({ languages: ['ja', 'de-AT', 'fr'], alternates }).replaced).toBe(undefined);
    expect(detect({ languages: ['ja', 'fr'], alternates }).replaced).toBe('/fr/pricing/?a=1#h');
  });

  it('does not redirect to a page that declares no alternate', () => {
    expect(detect({ languages: ['de'], alternates }).replaced).toBeUndefined();
    expect(detect({ languages: ['fr'], alternates: {} }).replaced).toBeUndefined();
  });

  it('never redirects from a localized page (including the old alias prefixes)', () => {
    expect(detect({ currentLocale: 'fr', languages: ['nl'], alternates }).replaced).toBeUndefined();
    expect(
      detect({ currentLocale: 'en', pathname: '/en-gb/pricing/', languages: ['fr'], alternates: {} }).replaced
    ).toBeUndefined();
  });

  it('does nothing when a preference is stored', () => {
    expect(detect({ languages: ['fr'], stored: 'en-gb', alternates }).replaced).toBeUndefined();
  });

  it('does not redirect when storage is unavailable', () => {
    expect(detect({ languages: ['fr'], storageThrows: true, alternates }).replaced).toBeUndefined();
  });

  it('stores en and stays put when nothing matches', () => {
    const result = detect({ languages: ['ja'], alternates });
    expect(result.replaced).toBeUndefined();
    expect(result.stored).toBe('en');
  });
});

describe('flags are first-party (D24, B34)', () => {
  it('serves flags from /flags/ and never from a CDN', () => {
    expect(getFlagUrl('fr')).toBe('/flags/fr.svg');
    expect(getFlagUrl('gb-sct')).toBe('/flags/gb-sct.svg');
    expect(getFlagUrl('ir', 'fa')).toBe('/flags/ir.png');
    expect(getFlagUrl('ir')).not.toContain('http');
  });
});

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Import everything from i18n index
import en from '../i18n/en';
import { translations, locales, localeAliases, localeAliasMap, isRTL, allLocales } from '../i18n/index';

const englishKeys = Object.keys(en);
const englishTranslations = en as Record<string, string>;

// I18N_MODE: "strict" (default) or "english-first" (D38). In english-first mode a key may be
// missing from, or extra in, a non-English locale only when src/i18n/pending/keys.json lists it
// under `added` or `removed`. In strict mode both pending manifests must be empty.
const MODE = process.env.I18N_MODE || 'strict';
if (MODE !== 'strict' && MODE !== 'english-first') {
  throw new Error(`I18N_MODE must be "strict" or "english-first" (got "${MODE}")`);
}
const ENGLISH_FIRST = MODE === 'english-first';

const I18N_DIR = path.join(__dirname, '..', 'i18n');
const PAGE_STATUSES = ['machine', 'checked', 'reviewed', 'legacy'];

type Lock = { keys: Record<string, string>; identicalApproved: string[]; pages: Record<string, string> };

function readJson<T>(file: string, fallback: T): T {
  return fs.existsSync(file) ? { ...fallback, ...JSON.parse(fs.readFileSync(file, 'utf-8')) } : fallback;
}

const pendingKeys = readJson(path.join(I18N_DIR, 'pending', 'keys.json'), { added: [] as string[], removed: [] as string[] });
const pendingPages = readJson(path.join(I18N_DIR, 'pending', 'pages.json'), { added: [] as string[] });
const pendingAdded = new Set(ENGLISH_FIRST ? pendingKeys.added : []);
const pendingRemoved = new Set(ENGLISH_FIRST ? pendingKeys.removed : []);

// Lock entries (keys or identicalApproved) for keys outside en.ts are orphans, except that in
// English-first mode a key listed under `removed` may keep its entry until the translation group prunes it.
function findOrphans(entries: string[], englishKeySet: Set<string>, removed: Set<string>): string[] {
  return entries.filter(k => !englishKeySet.has(k) && !removed.has(k));
}

function loadLock(locale: string): Lock {
  return readJson<Lock>(path.join(I18N_DIR, 'locks', `${locale}.json`), { keys: {}, identicalApproved: [], pages: {} });
}

// First 8 hex digits of the SHA-256 of the English value (see scripts/i18n-manager.mjs)
function hashValue(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex').slice(0, 8);
}

function placeholders(value: string): string[] {
  return [...value.matchAll(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g)].map(m => m[1]).sort();
}

const nonEnglishLocales = Object.keys(translations).filter(l => l !== 'en');

// Scan source files for translation key usage
function findUsedTranslationKeys(): Set<string> {
  const usedKeys = new Set<string>();
  const srcDir = path.join(__dirname, '..', '..');

  function scanDirectory(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // Skip node_modules, dist, and i18n locale files (but scan i18n/index.ts)
        if (!['node_modules', 'dist', '.git'].includes(entry.name)) {
          scanDirectory(fullPath);
        }
      } else if (entry.isFile() && /\.(ts|tsx|astro|js|mjs)$/.test(entry.name)) {
        // Skip test files, i18n manager script, and locale files (but not index.ts)
        if (entry.name.includes('.test.') || entry.name === 'i18n-manager.mjs') {
          continue;
        }
        // Skip locale translation files (e.g., en.ts, ar.ts) but scan index.ts
        if (dir.endsWith('/i18n') && entry.name !== 'index.ts') {
          continue;
        }

        const content = fs.readFileSync(fullPath, 'utf-8');

        // Match t('key'), t("key"), t(`key`)
        const tFunctionMatches = content.matchAll(/\bt\s*\(\s*['"`]([^'"`]+)['"`]/g);
        for (const match of tFunctionMatches) {
          usedKeys.add(match[1]);
        }

        // Match direct key references in objects/arrays (e.g., 'meta.title')
        // that might be used dynamically
        const keyLiteralMatches = content.matchAll(/['"`]([a-z]+\.[a-z.]+)['"`]/gi);
        for (const match of keyLiteralMatches) {
          // Only add if it looks like a translation key (has a dot and matches English keys)
          if (englishKeys.includes(match[1])) {
            usedKeys.add(match[1]);
          }
        }
      }
    }
  }

  scanDirectory(path.join(srcDir, 'src'));
  return usedKeys;
}

describe('Translation Files Integrity', () => {
  describe(`Pending manifests (mode: ${MODE})`, () => {
    if (ENGLISH_FIRST) {
      it('pending keys are consistent with en.ts', () => {
        const englishKeySet = new Set(englishKeys);
        expect(pendingKeys.added.filter(k => !englishKeySet.has(k)), 'added keys must exist in en.ts').toEqual([]);
        expect(pendingKeys.removed.filter(k => englishKeySet.has(k)), 'removed keys must not exist in en.ts').toEqual([]);
      });
    } else {
      it('pending/keys.json is empty in strict mode', () => {
        expect(pendingKeys.added, 'pending/keys.json "added" must be empty in strict mode').toEqual([]);
        expect(pendingKeys.removed, 'pending/keys.json "removed" must be empty in strict mode').toEqual([]);
      });
      it('pending/pages.json is empty in strict mode', () => {
        expect(pendingPages.added, 'pending/pages.json "added" must be empty in strict mode').toEqual([]);
      });
    }
  });

  describe('Completeness - All locales have all English keys', () => {
    for (const locale of nonEnglishLocales) {
      it(`${locale} has all ${englishKeys.length} English keys`, () => {
        const translation = translations[locale as keyof typeof translations];
        const translationKeys = new Set(Object.keys(translation));
        const missingKeys = englishKeys.filter(key => !translationKeys.has(key) && !pendingAdded.has(key));

        expect(
          missingKeys,
          `${locale} is missing ${missingKeys.length} keys:\n  ${missingKeys.join('\n  ')}`
        ).toEqual([]);
      });
    }
  });

  describe('No Extraneous Keys - No locale has keys not in English', () => {
    for (const locale of nonEnglishLocales) {
      it(`${locale} has no extraneous keys`, () => {
        const translation = translations[locale as keyof typeof translations];
        const englishKeySet = new Set(englishKeys);
        const extraneousKeys = Object.keys(translation).filter(key => !englishKeySet.has(key) && !pendingRemoved.has(key));

        expect(
          extraneousKeys,
          `${locale} has ${extraneousKeys.length} extraneous keys:\n  ${extraneousKeys.join('\n  ')}`
        ).toEqual([]);
      });
    }
  });

  describe('No English Placeholders - identical values must be approved in the locale lock', () => {
    for (const locale of nonEnglishLocales) {
      it(`${locale} has no unapproved English-identical values`, () => {
        const translation = translations[locale as keyof typeof translations] as Record<string, string>;
        const approved = new Set(loadLock(locale).identicalApproved);
        const identicalKeys = englishKeys.filter(
          key => key in translation && translation[key] === englishTranslations[key] && !approved.has(key)
        );

        expect(
          identicalKeys,
          `${locale} has ${identicalKeys.length} keys identical to English and not in src/i18n/locks/${locale}.json identicalApproved:\n  ${identicalKeys.join('\n  ')}`
        ).toEqual([]);
      });

      it(`${locale} identicalApproved lists only keys that are still identical`, () => {
        const translation = translations[locale as keyof typeof translations] as Record<string, string>;
        const bad = loadLock(locale).identicalApproved.filter(
          key =>
            !pendingRemoved.has(key) &&
            (!(key in englishTranslations) || translation[key] !== englishTranslations[key])
        );
        expect(bad, `${locale} identicalApproved has entries that are translated or not in en.ts:\n  ${bad.join('\n  ')}`).toEqual([]);
      });
    }
  });

  describe('Lock staleness - translations were made from the current English', () => {
    for (const locale of nonEnglishLocales) {
      it(`${locale} has a lock entry matching the current English for every key`, () => {
        const translation = translations[locale as keyof typeof translations] as Record<string, string>;
        const lock = loadLock(locale);
        const stale: string[] = [];
        const unconfirmed: string[] = [];

        for (const key of englishKeys) {
          if (!(key in translation)) continue; // missing keys are caught by completeness
          if (pendingAdded.has(key)) continue; // English-first: awaiting (re)translation
          if (!(key in lock.keys)) unconfirmed.push(key);
          else if (lock.keys[key] !== hashValue(englishTranslations[key])) stale.push(key);
        }

        expect(
          { stale, unconfirmed },
          `${locale}: ${stale.length} stale (English changed since locked), ${unconfirmed.length} unconfirmed (no lock entry).\n` +
          `  Retranslate, then run: npm run i18n lock ${locale} --keys <key,...>`
        ).toEqual({ stale: [], unconfirmed: [] });
      });

      it(`${locale} lock has no entries for keys outside en.ts`, () => {
        const englishKeySet = new Set(englishKeys);
        const orphans = findOrphans(Object.keys(loadLock(locale).keys), englishKeySet, pendingRemoved);
        expect(orphans).toEqual([]);
      });
    }

    it('orphan lock entries are allowed only for keys listed under removed in English-first mode', () => {
      const en = new Set(['a', 'b']);
      const lockKeys = ['a', 'b', 'gone'];
      // English-first, listed under removed: allowed
      expect(findOrphans(lockKeys, en, new Set(['gone']))).toEqual([]);
      // English-first, not listed: fails
      expect(findOrphans(lockKeys, en, new Set(['other']))).toEqual(['gone']);
      // Strict mode: the removed set is always empty, so the orphan fails
      expect(findOrphans(lockKeys, en, new Set())).toEqual(['gone']);
    });

    it('every non-English locale has a lock file', () => {
      const missing = nonEnglishLocales.filter(l => !fs.existsSync(path.join(I18N_DIR, 'locks', `${l}.json`)));
      expect(missing, `Missing lock files: ${missing.join(', ')}`).toEqual([]);
    });
  });

  describe('Page review statuses in locks', () => {
    for (const locale of nonEnglishLocales) {
      it(`${locale} has valid page review statuses and none still "machine"`, () => {
        const pages = loadLock(locale).pages;
        const invalid = Object.entries(pages).filter(([, st]) => !PAGE_STATUSES.includes(st)).map(([pg, st]) => `${pg}: ${st}`);
        expect(invalid, `Invalid statuses (allowed: ${PAGE_STATUSES.join(', ')})`).toEqual([]);
        const machine = Object.entries(pages).filter(([, st]) => st === 'machine').map(([pg]) => pg);
        expect(machine, `Pages not yet checked by an independent back-translation: ${machine.join(', ')}`).toEqual([]);
      });
    }
  });

  describe('Placeholder parity - {name} placeholders match English exactly', () => {
    const keysWithPlaceholders = englishKeys.filter(key => placeholders(englishTranslations[key]).length > 0);

    it('English placeholders are well-formed (no stray braces)', () => {
      const stray = englishKeys.filter(key => {
        const stripped = englishTranslations[key].replace(/\{[A-Za-z_][A-Za-z0-9_]*\}/g, '');
        return /[{}]/.test(stripped);
      });
      expect(stray, `Keys with stray braces:\n  ${stray.join('\n  ')}`).toEqual([]);
    });

    for (const locale of nonEnglishLocales) {
      it(`${locale} uses the same placeholders as English`, () => {
        const translation = translations[locale as keyof typeof translations] as Record<string, string>;
        const mismatched: string[] = [];
        for (const key of englishKeys) {
          const value = translation[key];
          if (value === undefined) continue; // missing keys are caught by completeness
          const expected = placeholders(englishTranslations[key]);
          const actual = placeholders(value);
          if (expected.join(',') !== actual.join(',')) {
            mismatched.push(`${key}: expected {${expected.join('}, {')}} got {${actual.join('}, {')}}`);
          }
        }
        expect(mismatched, `${locale} placeholder mismatches (${keysWithPlaceholders.length} English keys use placeholders):\n  ${mismatched.join('\n  ')}`).toEqual([]);
      });
    }
  });

  describe('hero.typewriterWords JSON validation', () => {
    const allLocales = Object.keys(translations);
    for (const locale of allLocales) {
      it(`${locale} has valid hero.typewriterWords JSON`, () => {
        const translation = translations[locale as keyof typeof translations];
        const value = translation['hero.typewriterWords' as keyof typeof translation];

        expect(value, `${locale} is missing hero.typewriterWords`).toBeDefined();

        let parsed: unknown;
        expect(() => {
          parsed = JSON.parse(value as string);
        }, `${locale} has invalid JSON in hero.typewriterWords: ${value}`).not.toThrow();

        expect(
          Array.isArray(parsed),
          `${locale} hero.typewriterWords is not an array`
        ).toBe(true);

        const arr = parsed as unknown[];
        expect(
          arr.length,
          `${locale} hero.typewriterWords is empty`
        ).toBeGreaterThan(0);

        for (let i = 0; i < arr.length; i++) {
          expect(
            typeof arr[i] === 'string' && (arr[i] as string).trim().length > 0,
            `${locale} hero.typewriterWords[${i}] is not a non-empty string: ${JSON.stringify(arr[i])}`
          ).toBe(true);
        }
      });
    }
  });

  describe('HTML tag preservation', () => {
    // Find English keys that contain HTML tags
    const htmlTagRegex = /<[^>]+>/g;
    const keysWithHtml = englishKeys.filter(key => htmlTagRegex.test(englishTranslations[key]));

    if (keysWithHtml.length > 0) {
      const localesToTest = Object.keys(translations).filter(l => l !== 'en');

      for (const key of keysWithHtml) {
        const englishTags = [...englishTranslations[key].matchAll(/<[^>]+>/g)].map(m => m[0]).sort();

        for (const locale of localesToTest) {
          it(`${locale} preserves HTML tags in ${key}`, () => {
            const translation = translations[locale as keyof typeof translations];
            const value = (translation as Record<string, string>)[key];
            if (!value) return; // Missing key caught by completeness test

            const translatedTags = [...(value as string).matchAll(/<[^>]+>/g)].map(m => m[0]).sort();
            expect(
              translatedTags,
              `${locale} ${key} has different HTML tags.\n  Expected: ${englishTags.join(', ')}\n  Got: ${translatedTags.join(', ')}`
            ).toEqual(englishTags);
          });
        }
      }
    }
  });

  describe('Whitespace quality', () => {
    // hero.subtitleStatic intentionally has a leading space
    const LEADING_SPACE_ALLOWED = new Set(['hero.subtitleStatic']);

    const allLocales = Object.keys(translations);
    for (const locale of allLocales) {
      it(`${locale} has no whitespace issues`, () => {
        const translation = translations[locale as keyof typeof translations];
        const issues: string[] = [];

        for (const key of Object.keys(translation)) {
          const value = (translation as Record<string, string>)[key];
          if (!value) continue;

          // Check leading/trailing whitespace (except allowed keys)
          if (!LEADING_SPACE_ALLOWED.has(key)) {
            if (value !== value.trim()) {
              issues.push(`${key}: has leading/trailing whitespace: ${JSON.stringify(value.slice(0, 40))}`);
            }
          } else {
            // For allowed leading-space keys, still check trailing whitespace
            if (value !== value.trimEnd()) {
              issues.push(`${key}: has trailing whitespace`);
            }
          }

          // Check double spaces
          if (value.includes('  ')) {
            issues.push(`${key}: contains double spaces`);
          }
        }

        expect(
          issues,
          `${locale} has ${issues.length} whitespace issues:\n  ${issues.join('\n  ')}`
        ).toEqual([]);
      });
    }
  });

  describe('Key ordering consistency', () => {
    const localesToTest = Object.keys(translations).filter(l => l !== 'en');
    for (const locale of localesToTest) {
      it(`${locale} has keys in the same order as English`, () => {
        const translation = translations[locale as keyof typeof translations];
        const translationKeys = Object.keys(translation);
        const englishKeySet = new Set(englishKeys);

        // Only compare keys that exist in both (missing/extra keys caught elsewhere)
        const localeKeysInEnglish = translationKeys.filter(k => englishKeySet.has(k));
        const englishKeysInLocale = englishKeys.filter(k => translationKeys.includes(k));

        expect(
          localeKeysInEnglish,
          `${locale} has keys in a different order than English`
        ).toEqual(englishKeysInLocale);
      });
    }
  });

  describe('Alias config validation', () => {
    it('All alias targets point to existing locales', () => {
      const localeSet = new Set(locales);
      const invalidAliases: string[] = [];

      for (const alias of localeAliases) {
        const target = localeAliasMap[alias];
        if (!localeSet.has(target)) {
          invalidAliases.push(`${alias} -> ${target}`);
        }
      }

      expect(
        invalidAliases,
        `Found aliases pointing to non-existent locales:\n  ${invalidAliases.join('\n  ')}`
      ).toEqual([]);
    });

    it('All aliases resolve to locales with translations', () => {
      for (const alias of localeAliases) {
        const target = localeAliasMap[alias];
        expect(
          translations[target],
          `Alias ${alias} targets ${target} which has no translations`
        ).toBeDefined();
      }
    });
  });

  describe('Code Coverage - All used translation keys exist', () => {
    const usedKeys = findUsedTranslationKeys();

    it('All translation keys used in code exist in English file', () => {
      const englishKeySet = new Set(englishKeys);
      const missingKeys = [...usedKeys].filter(key => !englishKeySet.has(key));

      expect(
        missingKeys,
        `Found ${missingKeys.length} translation keys used in code but missing from en.ts:\n  ${missingKeys.join('\n  ')}`
      ).toEqual([]);
    });
  });

  describe('No Unused Keys - All translation keys are used in code', () => {
    const usedKeys = findUsedTranslationKeys();

    it('All English translation keys are used somewhere in the codebase', () => {
      // English-first (D38) lets a key listed under pending/keys.json `added` wait for the later
      // wave whose code uses it (rules for every package). They are printed so the coordinator
      // can check the list. Strict mode needs that manifest empty, so it still catches them all.
      const waiting = englishKeys.filter(key => !usedKeys.has(key) && pendingAdded.has(key));
      if (waiting.length > 0) {
        console.warn(`English-first: ${waiting.length} pending keys not used in code yet:\n  ${waiting.join('\n  ')}`);
      }
      const unusedKeys = englishKeys.filter(key => !usedKeys.has(key) && !pendingAdded.has(key));

      // Every other key must be referenced in code.
      expect(
        unusedKeys,
        `Found ${unusedKeys.length} unused translation keys that should be removed:\n  ${unusedKeys.join('\n  ')}`
      ).toEqual([]);
    });
  });

  describe('Structural Integrity', () => {
    it('English file has translations', () => {
      expect(englishKeys.length).toBeGreaterThan(0);
    });

    it('All locale files are loaded', () => {
      // Get all .ts files in i18n directory except index.ts
      const i18nDir = path.join(__dirname, '..', 'i18n');
      const files = fs.readdirSync(i18nDir)
        .filter(f => f.endsWith('.ts') && f !== 'index.ts' && f !== 'pseudo.ts' && !f.endsWith('.test.ts') && f !== 'translations-template.ts')
        .map(f => f.replace('.ts', ''));

      const loadedLocales = Object.keys(translations);

      for (const locale of files) {
        expect(
          loadedLocales,
          `Expected locale ${locale} to be loaded in src/i18n/index.ts`
        ).toContain(locale);
      }
    });

    it('No empty translation values in English', () => {
      const emptyKeys = englishKeys.filter(key => {
        const value = englishTranslations[key];
        return !value || value.trim() === '';
      });

      expect(
        emptyKeys,
        `English has ${emptyKeys.length} empty values:\n  ${emptyKeys.join('\n  ')}`
      ).toEqual([]);
    });

    it('No empty translation values in any locale', () => {
      const emptyByLocale: Record<string, string[]> = {};
      const localesToTest = Object.keys(translations);

      for (const locale of localesToTest) {
        const translation = translations[locale as keyof typeof translations];
        const emptyKeys = Object.entries(translation)
          .filter(([key, value]) => !value || (value as string).trim() === '')
          .map(([key]) => key);

        if (emptyKeys.length > 0) {
          emptyByLocale[locale] = emptyKeys;
        }
      }

      const localesWithEmpty = Object.keys(emptyByLocale);

      // Build detailed error message showing each locale and its empty keys
      const errorDetails = localesWithEmpty
        .map(locale => `  ${locale}: ${emptyByLocale[locale].join(', ')}`)
        .join('\n');

      expect(
        localesWithEmpty,
        `Found empty translation values in ${localesWithEmpty.length} locales:\n${errorDetails}`
      ).toEqual([]);
    });
  });
});

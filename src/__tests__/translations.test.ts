import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

// Import everything from i18n index
import en from '../i18n/en';
import { translations, locales, localeAliases, localeAliasMap, isRTL, allLocales } from '../i18n/index';

const englishKeys = Object.keys(en);
const englishTranslations = en as Record<string, string>;

// Keys that are expected to be the same across all languages (brand names, URLs, etc.)
const ALLOWED_IDENTICAL_KEYS = new Set([
  'header.logoText', // Brand name
  'footer.company',
  'footer.product', // Product name
  'hero.titleHighlight', // "Badger" - brand mascot name
  'pricing.plan.name', // "Free" - often kept in English for branding
  'pricing.enterprise.badge', // "Enterprise" - industry term
  'pricing.enterprise.name', // "Enterprise" - industry term
  'pricing.enterprise.period', // Formatting often identical
  'comingSoon.ai.title', // "AI" is universal
]);

// Keys that contain technical content that may legitimately be identical
const TECHNICAL_KEY_PATTERNS = [
  /^app\./,
  /^api\./,
  /\.url$/,
];

function isAllowedIdentical(key: string): boolean {
  if (ALLOWED_IDENTICAL_KEYS.has(key)) return true;
  return TECHNICAL_KEY_PATTERNS.some(pattern => pattern.test(key));
}

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
  describe('Completeness - All locales have all English keys', () => {
    const localesToTest = Object.keys(translations).filter(l => l !== 'en');
    for (const locale of localesToTest) {
      it(`${locale} has all ${englishKeys.length} English keys`, () => {
        const translation = translations[locale as keyof typeof translations];
        const translationKeys = new Set(Object.keys(translation));
        const missingKeys = englishKeys.filter(key => !translationKeys.has(key));

        expect(
          missingKeys,
          `${locale} is missing ${missingKeys.length} keys:\n  ${missingKeys.join('\n  ')}`
        ).toEqual([]);
      });
    }
  });

  describe('No Extraneous Keys - No locale has keys not in English', () => {
    const localesToTest = Object.keys(translations).filter(l => l !== 'en');
    for (const locale of localesToTest) {
      it(`${locale} has no extraneous keys`, () => {
        const translation = translations[locale as keyof typeof translations];
        const englishKeySet = new Set(englishKeys);
        const translationKeys = Object.keys(translation);
        const extraneousKeys = translationKeys.filter(key => !englishKeySet.has(key));

        expect(
          extraneousKeys,
          `${locale} has ${extraneousKeys.length} extraneous keys:\n  ${extraneousKeys.join('\n  ')}`
        ).toEqual([]);
      });
    }
  });

  describe('No English Placeholders - Translations should not be identical to English', () => {
    const localesToTest = Object.keys(translations).filter(l => l !== 'en');
    for (const locale of localesToTest) {
      it(`${locale} has no untranslated English placeholders`, () => {
        const translation = translations[locale as keyof typeof translations];
        const identicalKeys: string[] = [];

        for (const key of englishKeys) {
          const englishValue = englishTranslations[key];
          const translatedValue = translation[key];

          // Skip if this key is allowed to be identical
          if (isAllowedIdentical(key)) continue;

          // Skip very short values (like "OK", "No", etc.)
          if (englishValue && englishValue.length <= 3) continue;

          // Check if values are identical
          if (englishValue && translatedValue && englishValue === translatedValue) {
            identicalKeys.push(key);
          }
        }

        // Allow some identical keys (reasonable threshold for coincidental matches)
        // but flag if there are many. Nigerian Pidgin (pcm) is a special case.
        const MAX_ALLOWED_IDENTICAL = locale === 'pcm' ? 100 : 5;

        expect(
          identicalKeys.length,
          `${locale} has ${identicalKeys.length} keys identical to English (possible untranslated placeholders):\n  ${identicalKeys.slice(0, 20).join('\n  ')}${identicalKeys.length > 20 ? `\n  ... and ${identicalKeys.length - 20} more` : ''}`
        ).toBeLessThanOrEqual(MAX_ALLOWED_IDENTICAL);
      });
    }
  });

  describe('Cross-locale untranslated detection', () => {
    it('No key is identical to English in more than 10 locales', () => {
      const localesToTest = Object.keys(translations).filter(l => l !== 'en' && l !== 'pcm');
      const identicalCounts: Record<string, string[]> = {};

      for (const key of englishKeys) {
        if (isAllowedIdentical(key)) continue;
        if (englishTranslations[key] && englishTranslations[key].length <= 3) continue;

        const identicalLocales: string[] = [];
        for (const locale of localesToTest) {
          const translation = translations[locale as keyof typeof translations];
          if (translation[key] && englishTranslations[key] === translation[key]) {
            identicalLocales.push(locale);
          }
        }

        if (identicalLocales.length > 10) {
          identicalCounts[key] = identicalLocales;
        }
      }

      const flaggedKeys = Object.keys(identicalCounts);
      expect(
        flaggedKeys,
        `${flaggedKeys.length} keys are identical to English in >10 locales (likely untranslated):\n${flaggedKeys.map(k => `  ${k} (${identicalCounts[k].length} locales): ${identicalCounts[k].slice(0, 5).join(', ')}...`).join('\n')}`
      ).toEqual([]);
    });
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
            const value = translation[key];
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
          const value = translation[key] as string;
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
      const unusedKeys = englishKeys.filter(key => !usedKeys.has(key));

      // No filtering! All keys must be used.
      // If a key exists, it should be referenced in code.
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
        .filter(f => f.endsWith('.ts') && f !== 'index.ts' && !f.endsWith('.test.ts') && f !== 'translations-template.ts')
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

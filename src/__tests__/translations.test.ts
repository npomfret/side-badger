import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

// Import all translation files
import en from '../i18n/en';
import ar from '../i18n/ar';
import cy from '../i18n/cy';
import de from '../i18n/de';
import es from '../i18n/es';
import eu from '../i18n/eu';
import ga from '../i18n/ga';
import hi from '../i18n/hi';
import itIT from '../i18n/it';
import ja from '../i18n/ja';
import ko from '../i18n/ko';
import lv from '../i18n/lv';
import nlBE from '../i18n/nl-BE';
import no from '../i18n/no';
import ph from '../i18n/ph';
import sv from '../i18n/sv';
import uk from '../i18n/uk';

const translations: Record<string, Record<string, string>> = {
  ar,
  cy,
  de,
  es,
  eu,
  ga,
  hi,
  it: itIT,
  ja,
  ko,
  lv,
  'nl-BE': nlBE,
  no,
  ph,
  sv,
  uk,
};

const englishKeys = Object.keys(en);
const englishTranslations = en as Record<string, string>;

// Keys that are expected to be the same across all languages (brand names, URLs, etc.)
const ALLOWED_IDENTICAL_KEYS = new Set([
  'app.url',
  'api.baseUrl',
  'header.logoText', // Brand name - some locales keep it, some translate
  'footer.company',
  'footer.product', // Product name
  'footer.legal', // "Legal" is sometimes kept in English
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
        // Skip node_modules, dist, and i18n directory (translation files themselves)
        if (!['node_modules', 'dist', '.git', 'i18n'].includes(entry.name)) {
          scanDirectory(fullPath);
        }
      } else if (entry.isFile() && /\.(ts|tsx|astro|js|mjs)$/.test(entry.name)) {
        // Skip test files and the i18n manager script
        if (entry.name.includes('.test.') || entry.name === 'i18n-manager.mjs') {
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
    for (const [locale, translation] of Object.entries(translations)) {
      it(`${locale} has all ${englishKeys.length} English keys`, () => {
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
    for (const [locale, translation] of Object.entries(translations)) {
      it(`${locale} has no extraneous keys`, () => {
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
    for (const [locale, translation] of Object.entries(translations)) {
      it(`${locale} has no untranslated English placeholders`, () => {
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
        // but flag if there are many
        const MAX_ALLOWED_IDENTICAL = 5;

        expect(
          identicalKeys.length,
          `${locale} has ${identicalKeys.length} keys identical to English (possible untranslated placeholders):\n  ${identicalKeys.slice(0, 20).join('\n  ')}${identicalKeys.length > 20 ? `\n  ... and ${identicalKeys.length - 20} more` : ''}`
        ).toBeLessThanOrEqual(MAX_ALLOWED_IDENTICAL);
      });
    }
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
      // Expected locales based on the i18n directory
      const expectedLocales = [
        'ar', 'cy', 'de', 'es', 'eu', 'ga', 'hi', 'it',
        'ja', 'ko', 'lv', 'nl-BE', 'no', 'ph', 'sv', 'uk'
      ];

      const loadedLocales = Object.keys(translations);

      for (const locale of expectedLocales) {
        expect(
          loadedLocales,
          `Expected locale ${locale} to be loaded`
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

      for (const [locale, translation] of Object.entries(translations)) {
        const emptyKeys = Object.entries(translation)
          .filter(([key, value]) => !value || value.trim() === '')
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

#!/usr/bin/env node

/**
 * Translation Management Tool for Side Badger
 *
 * A comprehensive CLI tool for managing i18n translation files.
 * English (en.ts) is treated as the master/source-of-truth file.
 *
 * Usage: node scripts/i18n-manager.mjs <command> [options]
 *
 * Commands:
 *   list          List all translation keys or filter by pattern
 *   get           Get a specific translation key across all languages
 *   set           Set a translation value for a specific key and language
 *   delete        Delete a translation key from all languages
 *   search        Search translations by value (content search)
 *   audit         Audit translations for missing/extra keys
 *   compare       Compare two languages side by side
 *   export        Export translations to JSON/CSV
 *   import        Import translations from JSON
 *   stats         Show translation statistics
 *   add-key       Add a new key to all language files
 *   rename-key    Rename a key across all language files
 *   find-unused   Find potentially unused translation keys
 *   sync          Sync missing keys from English to other languages
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const I18N_DIR = path.join(__dirname, '..', 'src', 'i18n');
const SRC_DIR = path.join(__dirname, '..', 'src');

// ANSI colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
};

const c = {
  error: (s) => `${colors.red}${s}${colors.reset}`,
  success: (s) => `${colors.green}${s}${colors.reset}`,
  warning: (s) => `${colors.yellow}${s}${colors.reset}`,
  info: (s) => `${colors.cyan}${s}${colors.reset}`,
  key: (s) => `${colors.blue}${s}${colors.reset}`,
  locale: (s) => `${colors.magenta}${s}${colors.reset}`,
  dim: (s) => `${colors.dim}${s}${colors.reset}`,
  bright: (s) => `${colors.bright}${s}${colors.reset}`,
};

/**
 * Parse a TypeScript translation file and extract the translations object
 */
function parseTranslationFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const translations = {};

  // Match key-value pairs in the format: 'key': 'value',
  // Values can contain escaped single quotes as \'
  const regex = /'([^']+)':\s*'((?:[^'\\]|\\.)*)'/g;
  let match;

  while ((match = regex.exec(content)) !== null) {
    const key = match[1];
    // Unescape \' to '
    const value = match[2].replace(/\\'/g, "'");
    translations[key] = value;
  }

  return translations;
}

/**
 * Get all locale files
 */
function getLocaleFiles() {
  const files = fs.readdirSync(I18N_DIR)
    .filter(f => f.endsWith('.ts') && f !== 'index.ts')
    .map(f => ({
      locale: f.replace('.ts', ''),
      path: path.join(I18N_DIR, f),
    }));

  // Sort with 'en' first, then alphabetically
  return files.sort((a, b) => {
    if (a.locale === 'en') return -1;
    if (b.locale === 'en') return 1;
    return a.locale.localeCompare(b.locale);
  });
}

/**
 * Load all translations
 */
function loadAllTranslations() {
  const localeFiles = getLocaleFiles();
  const translations = {};

  for (const { locale, path: filePath } of localeFiles) {
    translations[locale] = parseTranslationFile(filePath);
  }

  return translations;
}

/**
 * Write translations back to a file
 * Note: This modifies the file in place, updating only the specified key(s)
 * while preserving the original file structure and formatting
 */
function writeTranslationFile(locale, translations, modifiedKey = null) {
  const filePath = path.join(I18N_DIR, `${locale}.ts`);
  const content = fs.readFileSync(filePath, 'utf-8');

  if (modifiedKey) {
    // Update only the specific key while preserving file structure
    const escapedValue = translations[modifiedKey].replace(/'/g, "\\'");
    const keyRegex = new RegExp(`('${modifiedKey.replace(/\./g, '\\.')}': )'(?:[^'\\\\]|\\\\.)*'`, 'g');

    const newContent = content.replace(keyRegex, `$1'${escapedValue}'`);
    fs.writeFileSync(filePath, newContent);
  } else {
    // Full rewrite - sort keys for consistent output
    const sortedKeys = Object.keys(translations).sort();

    const lines = ['export default {'];
    for (const key of sortedKeys) {
      const value = translations[key];
      // Escape single quotes with backslash
      const escapedValue = value.replace(/'/g, "\\'");
      lines.push(`  '${key}': '${escapedValue}',`);
    }
    lines.push('} as const;');
    lines.push('');

    fs.writeFileSync(filePath, lines.join('\n'));
  }
}

/**
 * Filter keys by pattern (supports * wildcard)
 */
function filterKeys(keys, pattern) {
  if (!pattern) return keys;

  const regex = new RegExp(
    '^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$',
    'i'
  );
  return keys.filter(key => regex.test(key));
}

// ============================================================================
// Commands
// ============================================================================

/**
 * List translation keys
 */
function cmdList(args) {
  const pattern = args[0];
  const translations = loadAllTranslations();
  const englishKeys = Object.keys(translations.en).sort();
  const filteredKeys = filterKeys(englishKeys, pattern);

  console.log(c.bright(`\nTranslation Keys${pattern ? ` matching "${pattern}"` : ''}:`));
  console.log(c.dim(`Total: ${filteredKeys.length} keys\n`));

  // Group keys by prefix
  const groups = {};
  for (const key of filteredKeys) {
    const prefix = key.split('.')[0];
    if (!groups[prefix]) groups[prefix] = [];
    groups[prefix].push(key);
  }

  for (const [prefix, keys] of Object.entries(groups)) {
    console.log(c.info(`[${prefix}]`) + c.dim(` (${keys.length} keys)`));
    for (const key of keys) {
      const value = translations.en[key];
      const preview = value.length > 60 ? value.substring(0, 60) + '...' : value;
      console.log(`  ${c.key(key)}`);
      console.log(`    ${c.dim(preview)}`);
    }
    console.log();
  }
}

/**
 * Get a specific key across all languages
 */
function cmdGet(args) {
  const key = args[0];
  const specificLocale = args[1];

  if (!key) {
    console.error(c.error('Error: Please provide a translation key'));
    console.log('Usage: i18n-manager get <key> [locale]');
    process.exit(1);
  }

  const translations = loadAllTranslations();

  if (specificLocale) {
    if (!translations[specificLocale]) {
      console.error(c.error(`Error: Locale "${specificLocale}" not found`));
      process.exit(1);
    }
    const value = translations[specificLocale][key];
    if (value === undefined) {
      console.log(c.warning(`Key "${key}" not found in ${specificLocale}`));
    } else {
      console.log(value);
    }
    return;
  }

  console.log(c.bright(`\nTranslations for: ${c.key(key)}\n`));

  const locales = Object.keys(translations).sort((a, b) => {
    if (a === 'en') return -1;
    if (b === 'en') return 1;
    return a.localeCompare(b);
  });

  for (const locale of locales) {
    const value = translations[locale][key];
    const status = value === undefined
      ? c.error('MISSING')
      : locale === 'en'
        ? c.success('(master)')
        : '';

    console.log(`${c.locale(locale.padEnd(6))} ${status}`);
    if (value !== undefined) {
      console.log(`  ${value}\n`);
    } else {
      console.log();
    }
  }
}

/**
 * Set a translation value
 */
function cmdSet(args) {
  const key = args[0];
  const locale = args[1];
  const value = args.slice(2).join(' ');

  if (!key || !locale || !value) {
    console.error(c.error('Error: Please provide key, locale, and value'));
    console.log('Usage: i18n-manager set <key> <locale> <value>');
    process.exit(1);
  }

  const translations = loadAllTranslations();

  if (!translations[locale]) {
    console.error(c.error(`Error: Locale "${locale}" not found`));
    process.exit(1);
  }

  const oldValue = translations[locale][key];
  translations[locale][key] = value;

  writeTranslationFile(locale, translations[locale], key);

  console.log(c.success(`\nUpdated ${c.key(key)} in ${c.locale(locale)}:`));
  if (oldValue !== undefined) {
    console.log(c.dim(`  Old: ${oldValue}`));
  }
  console.log(`  New: ${value}`);
}

/**
 * Delete a key from all languages
 */
function cmdDelete(args) {
  const key = args[0];
  const force = args.includes('--force') || args.includes('-f');

  if (!key) {
    console.error(c.error('Error: Please provide a translation key'));
    console.log('Usage: i18n-manager delete <key> [--force]');
    process.exit(1);
  }

  const translations = loadAllTranslations();

  // Check if key exists in English
  if (!translations.en[key]) {
    console.error(c.error(`Error: Key "${key}" not found in English (master)`));
    process.exit(1);
  }

  if (!force) {
    console.log(c.warning(`\nThis will delete "${key}" from all ${Object.keys(translations).length} locale files.`));
    console.log(c.dim('Run with --force to confirm deletion.\n'));

    // Show preview of what will be deleted
    console.log(c.bright('Preview of values to be deleted:'));
    for (const locale of Object.keys(translations)) {
      if (translations[locale][key]) {
        const value = translations[locale][key];
        const preview = value.length > 50 ? value.substring(0, 50) + '...' : value;
        console.log(`  ${c.locale(locale)}: ${c.dim(preview)}`);
      }
    }
    process.exit(0);
  }

  // Delete from all locales
  let deletedCount = 0;
  for (const locale of Object.keys(translations)) {
    if (translations[locale][key]) {
      delete translations[locale][key];
      writeTranslationFile(locale, translations[locale]);
      deletedCount++;
    }
  }

  console.log(c.success(`\nDeleted "${key}" from ${deletedCount} locale files.`));
}

/**
 * Search translations by value content
 */
function cmdSearch(args) {
  const searchTerm = args.join(' ');
  const caseInsensitive = true;

  if (!searchTerm) {
    console.error(c.error('Error: Please provide a search term'));
    console.log('Usage: i18n-manager search <term>');
    process.exit(1);
  }

  const translations = loadAllTranslations();
  const results = [];

  for (const [locale, trans] of Object.entries(translations)) {
    for (const [key, value] of Object.entries(trans)) {
      const searchIn = caseInsensitive ? value.toLowerCase() : value;
      const term = caseInsensitive ? searchTerm.toLowerCase() : searchTerm;

      if (searchIn.includes(term)) {
        results.push({ locale, key, value });
      }
    }
  }

  console.log(c.bright(`\nSearch results for "${searchTerm}":`));
  console.log(c.dim(`Found ${results.length} matches\n`));

  // Group by key
  const byKey = {};
  for (const result of results) {
    if (!byKey[result.key]) byKey[result.key] = [];
    byKey[result.key].push(result);
  }

  for (const [key, matches] of Object.entries(byKey)) {
    console.log(c.key(key));
    for (const match of matches) {
      // Highlight the search term in the value
      const highlighted = match.value.replace(
        new RegExp(`(${searchTerm})`, 'gi'),
        `${colors.bgGreen}$1${colors.reset}`
      );
      console.log(`  ${c.locale(match.locale.padEnd(6))} ${highlighted}`);
    }
    console.log();
  }
}

/**
 * Audit translations for missing/extra keys
 */
function cmdAudit(args) {
  const targetLocale = args[0];
  const translations = loadAllTranslations();
  const englishKeys = new Set(Object.keys(translations.en));

  const locales = targetLocale
    ? [targetLocale]
    : Object.keys(translations).filter(l => l !== 'en');

  console.log(c.bright('\nTranslation Audit Report'));
  console.log(c.dim(`Master: en (${englishKeys.size} keys)\n`));

  let totalMissing = 0;
  let totalExtra = 0;

  for (const locale of locales) {
    if (!translations[locale]) {
      console.error(c.error(`Locale "${locale}" not found`));
      continue;
    }

    const localeKeys = new Set(Object.keys(translations[locale]));

    const missing = [...englishKeys].filter(k => !localeKeys.has(k));
    const extra = [...localeKeys].filter(k => !englishKeys.has(k));

    const statusIcon = missing.length === 0 && extra.length === 0
      ? c.success('✓')
      : c.warning('!');

    console.log(`${statusIcon} ${c.locale(locale.padEnd(8))} ` +
      `${missing.length > 0 ? c.error(`${missing.length} missing`) : c.success('0 missing')}, ` +
      `${extra.length > 0 ? c.warning(`${extra.length} extra`) : c.success('0 extra')}`);

    if (missing.length > 0) {
      console.log(c.dim('  Missing keys:'));
      for (const key of missing.slice(0, 10)) {
        console.log(`    ${c.error('-')} ${key}`);
      }
      if (missing.length > 10) {
        console.log(c.dim(`    ... and ${missing.length - 10} more`));
      }
    }

    if (extra.length > 0) {
      console.log(c.dim('  Extra keys (not in English):'));
      for (const key of extra.slice(0, 5)) {
        console.log(`    ${c.warning('+')} ${key}`);
      }
      if (extra.length > 5) {
        console.log(c.dim(`    ... and ${extra.length - 5} more`));
      }
    }

    totalMissing += missing.length;
    totalExtra += extra.length;
    console.log();
  }

  console.log(c.bright('Summary:'));
  console.log(`  Total missing: ${totalMissing > 0 ? c.error(totalMissing) : c.success(0)}`);
  console.log(`  Total extra: ${totalExtra > 0 ? c.warning(totalExtra) : c.success(0)}`);

  if (totalMissing === 0 && totalExtra === 0) {
    console.log(c.success('\nAll translations are in sync!'));
  }
}

/**
 * Compare two languages side by side
 */
function cmdCompare(args) {
  const locale1 = args[0] || 'en';
  const locale2 = args[1];
  const keyPattern = args[2];

  if (!locale2) {
    console.error(c.error('Error: Please provide two locales to compare'));
    console.log('Usage: i18n-manager compare <locale1> <locale2> [key-pattern]');
    process.exit(1);
  }

  const translations = loadAllTranslations();

  if (!translations[locale1] || !translations[locale2]) {
    console.error(c.error('Error: One or both locales not found'));
    process.exit(1);
  }

  const allKeys = new Set([
    ...Object.keys(translations[locale1]),
    ...Object.keys(translations[locale2])
  ]);

  let keys = [...allKeys].sort();
  if (keyPattern) {
    keys = filterKeys(keys, keyPattern);
  }

  console.log(c.bright(`\nComparing ${c.locale(locale1)} vs ${c.locale(locale2)}`));
  console.log(c.dim(`Keys: ${keys.length}\n`));

  for (const key of keys) {
    const val1 = translations[locale1][key];
    const val2 = translations[locale2][key];

    console.log(c.key(key));

    if (val1 === undefined) {
      console.log(`  ${c.locale(locale1)}: ${c.error('MISSING')}`);
    } else {
      console.log(`  ${c.locale(locale1)}: ${val1}`);
    }

    if (val2 === undefined) {
      console.log(`  ${c.locale(locale2)}: ${c.error('MISSING')}`);
    } else {
      console.log(`  ${c.locale(locale2)}: ${val2}`);
    }

    console.log();
  }
}

/**
 * Export translations to JSON or CSV
 */
function cmdExport(args) {
  const format = args[0] || 'json';
  const outputFile = args[1];

  const translations = loadAllTranslations();

  if (format === 'json') {
    const output = JSON.stringify(translations, null, 2);
    if (outputFile) {
      fs.writeFileSync(outputFile, output);
      console.log(c.success(`Exported to ${outputFile}`));
    } else {
      console.log(output);
    }
  } else if (format === 'csv') {
    const locales = Object.keys(translations);
    const keys = Object.keys(translations.en).sort();

    const rows = [['key', ...locales].join(',')];
    for (const key of keys) {
      const values = locales.map(l => {
        const val = translations[l][key] || '';
        // Escape CSV values
        return `"${val.replace(/"/g, '""')}"`;
      });
      rows.push([`"${key}"`, ...values].join(','));
    }

    const output = rows.join('\n');
    if (outputFile) {
      fs.writeFileSync(outputFile, output);
      console.log(c.success(`Exported to ${outputFile}`));
    } else {
      console.log(output);
    }
  } else {
    console.error(c.error(`Unknown format: ${format}. Use 'json' or 'csv'`));
    process.exit(1);
  }
}

/**
 * Import translations from JSON
 */
function cmdImport(args) {
  const inputFile = args[0];
  const targetLocale = args[1];
  const dryRun = args.includes('--dry-run');

  if (!inputFile) {
    console.error(c.error('Error: Please provide an input file'));
    console.log('Usage: i18n-manager import <file.json> [locale] [--dry-run]');
    process.exit(1);
  }

  const input = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));
  const translations = loadAllTranslations();

  // If input is a flat object, assume it's for a specific locale
  const isFlat = !Object.values(input).some(v => typeof v === 'object');

  if (isFlat) {
    if (!targetLocale) {
      console.error(c.error('Error: Flat JSON requires a target locale'));
      console.log('Usage: i18n-manager import <file.json> <locale>');
      process.exit(1);
    }

    const changes = [];
    for (const [key, value] of Object.entries(input)) {
      const oldValue = translations[targetLocale]?.[key];
      if (oldValue !== value) {
        changes.push({ key, oldValue, newValue: value });
      }
    }

    console.log(c.bright(`\nImporting to ${c.locale(targetLocale)}:`));
    console.log(`  ${changes.length} changes\n`);

    for (const change of changes.slice(0, 20)) {
      console.log(c.key(change.key));
      if (change.oldValue !== undefined) {
        console.log(`  ${c.dim('Old:')} ${change.oldValue}`);
      }
      console.log(`  ${c.success('New:')} ${change.newValue}`);
    }

    if (changes.length > 20) {
      console.log(c.dim(`\n... and ${changes.length - 20} more changes`));
    }

    if (!dryRun && changes.length > 0) {
      Object.assign(translations[targetLocale], input);
      writeTranslationFile(targetLocale, translations[targetLocale]);
      console.log(c.success(`\nImported ${changes.length} changes to ${targetLocale}`));
    } else if (dryRun) {
      console.log(c.warning('\n(Dry run - no changes made)'));
    }
  } else {
    // Multi-locale import
    let totalChanges = 0;
    for (const [locale, trans] of Object.entries(input)) {
      if (!translations[locale]) {
        console.log(c.warning(`Skipping unknown locale: ${locale}`));
        continue;
      }

      let changes = 0;
      for (const [key, value] of Object.entries(trans)) {
        if (translations[locale][key] !== value) {
          translations[locale][key] = value;
          changes++;
        }
      }

      if (changes > 0 && !dryRun) {
        writeTranslationFile(locale, translations[locale]);
      }

      console.log(`  ${c.locale(locale)}: ${changes} changes`);
      totalChanges += changes;
    }

    if (!dryRun) {
      console.log(c.success(`\nImported ${totalChanges} total changes`));
    } else {
      console.log(c.warning('\n(Dry run - no changes made)'));
    }
  }
}

/**
 * Show translation statistics
 */
function cmdStats(args) {
  const translations = loadAllTranslations();
  const englishKeys = Object.keys(translations.en);

  console.log(c.bright('\nTranslation Statistics\n'));

  // Overall stats
  console.log(c.info('Overview:'));
  console.log(`  Languages: ${Object.keys(translations).length}`);
  console.log(`  Total keys: ${englishKeys.length}`);
  console.log();

  // Keys by prefix
  const prefixes = {};
  for (const key of englishKeys) {
    const prefix = key.split('.')[0];
    prefixes[prefix] = (prefixes[prefix] || 0) + 1;
  }

  console.log(c.info('Keys by section:'));
  const sortedPrefixes = Object.entries(prefixes).sort((a, b) => b[1] - a[1]);
  for (const [prefix, count] of sortedPrefixes) {
    const bar = '█'.repeat(Math.ceil(count / 5));
    console.log(`  ${prefix.padEnd(20)} ${String(count).padStart(4)} ${c.dim(bar)}`);
  }
  console.log();

  // Completion by locale
  console.log(c.info('Completion by locale:'));
  const locales = Object.keys(translations).filter(l => l !== 'en').sort();

  for (const locale of locales) {
    const localeKeys = Object.keys(translations[locale]);
    const completion = (localeKeys.length / englishKeys.length * 100).toFixed(1);
    const missing = englishKeys.length - localeKeys.length;

    const barLength = Math.ceil(parseFloat(completion) / 5);
    const bar = c.success('█'.repeat(barLength)) + c.dim('░'.repeat(20 - barLength));

    const status = completion === '100.0'
      ? c.success('✓')
      : missing > 10
        ? c.error('!')
        : c.warning('~');

    console.log(`  ${status} ${locale.padEnd(8)} ${bar} ${completion.padStart(5)}% (${missing} missing)`);
  }

  // Character counts
  console.log();
  console.log(c.info('Content size (English):'));
  let totalChars = 0;
  let totalWords = 0;
  for (const value of Object.values(translations.en)) {
    totalChars += value.length;
    totalWords += value.split(/\s+/).length;
  }
  console.log(`  Characters: ${totalChars.toLocaleString()}`);
  console.log(`  Words: ~${totalWords.toLocaleString()}`);
}

/**
 * Add a new key to all languages
 */
function cmdAddKey(args) {
  const key = args[0];
  const englishValue = args.slice(1).join(' ');

  if (!key || !englishValue) {
    console.error(c.error('Error: Please provide a key and English value'));
    console.log('Usage: i18n-manager add-key <key> <english-value>');
    process.exit(1);
  }

  const translations = loadAllTranslations();

  // Check if key already exists
  if (translations.en[key]) {
    console.error(c.error(`Error: Key "${key}" already exists`));
    console.log(`Current value: ${translations.en[key]}`);
    process.exit(1);
  }

  // Add to English first
  translations.en[key] = englishValue;
  writeTranslationFile('en', translations.en);
  console.log(c.success(`Added "${key}" to en: ${englishValue}`));

  // Add placeholder to other locales
  const otherLocales = Object.keys(translations).filter(l => l !== 'en');
  console.log(c.dim(`\nAdded to ${otherLocales.length} other locales with English value as placeholder.`));
  console.log(c.warning('These will need to be translated.'));

  for (const locale of otherLocales) {
    translations[locale][key] = englishValue;
    writeTranslationFile(locale, translations[locale]);
  }
}

/**
 * Rename a key across all locales
 */
function cmdRenameKey(args) {
  const oldKey = args[0];
  const newKey = args[1];
  const force = args.includes('--force') || args.includes('-f');

  if (!oldKey || !newKey) {
    console.error(c.error('Error: Please provide old and new key names'));
    console.log('Usage: i18n-manager rename-key <old-key> <new-key> [--force]');
    process.exit(1);
  }

  const translations = loadAllTranslations();

  if (!translations.en[oldKey]) {
    console.error(c.error(`Error: Key "${oldKey}" not found`));
    process.exit(1);
  }

  if (translations.en[newKey]) {
    console.error(c.error(`Error: Key "${newKey}" already exists`));
    process.exit(1);
  }

  if (!force) {
    console.log(c.warning(`\nThis will rename "${oldKey}" to "${newKey}" in all locale files.`));
    console.log(c.dim('Run with --force to confirm.\n'));
    process.exit(0);
  }

  let renamedCount = 0;
  for (const locale of Object.keys(translations)) {
    if (translations[locale][oldKey] !== undefined) {
      translations[locale][newKey] = translations[locale][oldKey];
      delete translations[locale][oldKey];
      writeTranslationFile(locale, translations[locale]);
      renamedCount++;
    }
  }

  console.log(c.success(`\nRenamed "${oldKey}" to "${newKey}" in ${renamedCount} locale files.`));
  console.log(c.warning('\nRemember to update any code references to this key!'));
}

/**
 * Find potentially unused translation keys
 */
function cmdFindUnused(args) {
  const translations = loadAllTranslations();
  const englishKeys = Object.keys(translations.en);

  console.log(c.bright('\nSearching for unused translation keys...\n'));

  // Get all source files
  const sourceFiles = [];
  function walkDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
        walkDir(filePath);
      } else if (file.endsWith('.ts') || file.endsWith('.astro') || file.endsWith('.tsx')) {
        if (!filePath.includes('/i18n/')) {
          sourceFiles.push(filePath);
        }
      }
    }
  }
  walkDir(SRC_DIR);

  // Read all source code
  let allSource = '';
  for (const file of sourceFiles) {
    allSource += fs.readFileSync(file, 'utf-8');
  }

  // Check each key
  const potentiallyUnused = [];
  for (const key of englishKeys) {
    // Check if key appears in source (in quotes)
    if (!allSource.includes(`'${key}'`) && !allSource.includes(`"${key}"`)) {
      potentiallyUnused.push(key);
    }
  }

  if (potentiallyUnused.length === 0) {
    console.log(c.success('No potentially unused keys found!'));
  } else {
    console.log(c.warning(`Found ${potentiallyUnused.length} potentially unused keys:\n`));

    // Group by prefix
    const groups = {};
    for (const key of potentiallyUnused) {
      const prefix = key.split('.')[0];
      if (!groups[prefix]) groups[prefix] = [];
      groups[prefix].push(key);
    }

    for (const [prefix, keys] of Object.entries(groups)) {
      console.log(c.info(`[${prefix}]`));
      for (const key of keys) {
        console.log(`  ${c.dim('-')} ${key}`);
      }
    }

    console.log(c.dim('\nNote: Some keys may be dynamically generated. Verify before deleting.'));
  }
}

/**
 * Sync missing keys from English to other languages
 */
function cmdSync(args) {
  const targetLocale = args[0];
  const dryRun = args.includes('--dry-run');

  const translations = loadAllTranslations();
  const englishKeys = Object.keys(translations.en);

  const locales = targetLocale
    ? [targetLocale]
    : Object.keys(translations).filter(l => l !== 'en');

  console.log(c.bright('\nSyncing missing keys from English...\n'));

  let totalSynced = 0;

  for (const locale of locales) {
    if (!translations[locale]) {
      console.error(c.error(`Locale "${locale}" not found`));
      continue;
    }

    const localeKeys = new Set(Object.keys(translations[locale]));
    const missing = englishKeys.filter(k => !localeKeys.has(k));

    if (missing.length === 0) {
      console.log(`${c.success('✓')} ${c.locale(locale)} - already in sync`);
      continue;
    }

    console.log(`${c.warning('!')} ${c.locale(locale)} - ${missing.length} keys to sync`);

    for (const key of missing.slice(0, 5)) {
      console.log(`  ${c.dim('+')} ${key}`);
    }
    if (missing.length > 5) {
      console.log(c.dim(`  ... and ${missing.length - 5} more`));
    }

    if (!dryRun) {
      for (const key of missing) {
        translations[locale][key] = translations.en[key];
      }
      writeTranslationFile(locale, translations[locale]);
    }

    totalSynced += missing.length;
  }

  console.log();
  if (dryRun) {
    console.log(c.warning(`Would sync ${totalSynced} keys (dry run)`));
  } else {
    console.log(c.success(`Synced ${totalSynced} keys`));
  }

  if (totalSynced > 0) {
    console.log(c.warning('\nNote: Synced keys contain English text and need translation.'));
  }
}

/**
 * Show help
 */
function cmdHelp() {
  console.log(`
${c.bright('Translation Management Tool')}
${c.dim('Manage i18n translation files for Side Badger')}

${c.info('Usage:')} node scripts/i18n-manager.mjs <command> [options]

${c.info('Commands:')}

  ${c.bright('Querying:')}
    list [pattern]              List all keys (filter with pattern like "features.*")
    get <key> [locale]          Get a key's value across all languages (or specific locale)
    search <term>               Search translations by content

  ${c.bright('Modifying:')}
    set <key> <locale> <value>  Set a translation value
    add-key <key> <en-value>    Add a new key to all languages
    rename-key <old> <new>      Rename a key across all languages
    delete <key> [--force]      Delete a key from all languages

  ${c.bright('Analysis:')}
    audit [locale]              Check for missing/extra keys
    compare <locale1> <locale2> Compare two languages side by side
    stats                       Show translation statistics
    find-unused                 Find potentially unused keys

  ${c.bright('Bulk Operations:')}
    sync [locale] [--dry-run]   Copy missing keys from English
    export [json|csv] [file]    Export translations
    import <file> [locale]      Import translations from JSON

${c.info('Examples:')}
    npm run i18n list "pricing.*"
    npm run i18n get header.logoText
    npm run i18n set header.logoText de "Seite Dachs"
    npm run i18n search "split"
    npm run i18n audit ja
    npm run i18n compare en ja "features.*"
    npm run i18n sync -- --dry-run
    npm run i18n export json translations.json
`);
}

// ============================================================================
// Main
// ============================================================================

const command = process.argv[2];
const args = process.argv.slice(3);

const commands = {
  list: cmdList,
  get: cmdGet,
  set: cmdSet,
  delete: cmdDelete,
  search: cmdSearch,
  audit: cmdAudit,
  compare: cmdCompare,
  export: cmdExport,
  import: cmdImport,
  stats: cmdStats,
  'add-key': cmdAddKey,
  'rename-key': cmdRenameKey,
  'find-unused': cmdFindUnused,
  sync: cmdSync,
  help: cmdHelp,
  '--help': cmdHelp,
  '-h': cmdHelp,
};

if (!command || !commands[command]) {
  if (command && !commands[command]) {
    console.error(c.error(`Unknown command: ${command}\n`));
  }
  cmdHelp();
  process.exit(command ? 1 : 0);
}

try {
  commands[command](args);
} catch (error) {
  console.error(c.error(`Error: ${error.message}`));
  if (process.env.DEBUG) {
    console.error(error.stack);
  }
  process.exit(1);
}

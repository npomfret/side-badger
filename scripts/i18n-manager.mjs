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
 *   audit         Audit translations: missing, extra, stale and untranslated keys (exit 1 on any)
 *   lock          Record English hashes in src/i18n/locks/<locale>.json after translating
 *   stale         List stale and unconfirmed translations (exit 1 on any)
 *   compare       Compare two languages side by side
 *   export        Export translations to JSON/CSV
 *   import        Import translations from JSON
 *   stats         Show translation statistics
 *   add-key       Add a new key to all language files
 *   rename-key    Rename a key across all language files
 *   find-unused   Find potentially unused translation keys
 *   sync          Report locale drift from English (never writes English values)
 *   diff          Show uncommitted changes to translation files
 *
 * I18N_MODE=strict (default) | english-first. In english-first mode a key may be
 * missing from, or extra in, a locale only when src/i18n/pending/keys.json lists it
 * under `added` or `removed`. Strict mode requires both pending manifests to be empty.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import crypto from 'crypto';

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

  // 'key': 'value' or 'key': "value", read in file order so key order is preserved
  const pairRegex = /'([^']+)':\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")/g;
  const unescape = (v) => v.replace(/\\(.)/g, (_, ch) => (ch === 'n' ? '\n' : ch));

  let match;
  while ((match = pairRegex.exec(content)) !== null) {
    translations[match[1]] = unescape(match[2] !== undefined ? match[2] : match[3]);
  }

  return translations;
}

/**
 * Get all locale files
 */
function getLocaleFiles() {
  const files = fs.readdirSync(I18N_DIR)
    .filter(f => f.endsWith('.ts') && f !== 'index.ts' && f !== 'pseudo.ts')
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

  const escape = (v) => v.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');

  if (modifiedKey) {
    // Update only the specific key while preserving file structure
    const keyRegex = new RegExp(`('${modifiedKey.replace(/\./g, '\\.')}': )'(?:[^'\\\\]|\\\\.)*'`, 'g');
    const newContent = content.replace(keyRegex, (_, head) => `${head}'${escape(translations[modifiedKey])}'`);
    fs.writeFileSync(filePath, newContent);
  } else {
    // Full rewrite in English key order (extra keys follow, in their own order)
    const keys = Object.keys(translations);
    let ordered = keys;
    if (locale !== 'en') {
      const enOrder = Object.keys(parseTranslationFile(path.join(I18N_DIR, 'en.ts')));
      const present = new Set(keys);
      const enSet = new Set(enOrder);
      ordered = [...enOrder.filter(k => present.has(k)), ...keys.filter(k => !enSet.has(k))];
    }

    const lines = ['export default {'];
    for (const key of ordered) {
      lines.push(`  '${key}': '${escape(translations[key])}',`);
    }
    lines.push('} as const;');
    lines.push('');

    fs.writeFileSync(filePath, lines.join('\n'));
  }
}

// ============================================================================
// Locks, pending manifests and mode (D14, D15, D38)
// ============================================================================

const LOCKS_DIR = path.join(I18N_DIR, 'locks');
const PENDING_DIR = path.join(I18N_DIR, 'pending');
const PAGE_STATUSES = ['machine', 'checked', 'reviewed', 'legacy'];

function getMode() {
  const mode = process.env.I18N_MODE || 'strict';
  if (mode !== 'strict' && mode !== 'english-first') {
    throw new Error(`I18N_MODE must be "strict" or "english-first" (got "${mode}")`);
  }
  return mode;
}

function hashValue(value) {
  return crypto.createHash('sha256').update(value).digest('hex').slice(0, 8);
}

function lockPath(locale) {
  return path.join(LOCKS_DIR, `${locale}.json`);
}

function loadLock(locale) {
  const file = lockPath(locale);
  const empty = { keys: {}, identicalApproved: [], pages: {} };
  if (!fs.existsSync(file)) return empty;
  return { ...empty, ...JSON.parse(fs.readFileSync(file, 'utf-8')) };
}

function saveLock(locale, lock, enOrder) {
  const order = new Map(enOrder.map((k, i) => [k, i]));
  const byOrder = (a, b) => (order.get(a) ?? 1e9) - (order.get(b) ?? 1e9) || a.localeCompare(b);
  const out = {
    keys: Object.fromEntries(Object.keys(lock.keys).sort(byOrder).map(k => [k, lock.keys[k]])),
    identicalApproved: [...lock.identicalApproved].sort(byOrder),
    pages: Object.fromEntries(Object.entries(lock.pages).sort(([a], [b]) => a.localeCompare(b))),
  };
  fs.mkdirSync(LOCKS_DIR, { recursive: true });
  fs.writeFileSync(lockPath(locale), JSON.stringify(out, null, 2) + '\n');
}

function loadPending() {
  const read = (name, fallback) => {
    const file = path.join(PENDING_DIR, name);
    return fs.existsSync(file) ? { ...fallback, ...JSON.parse(fs.readFileSync(file, 'utf-8')) } : fallback;
  };
  return {
    keys: read('keys.json', { added: [], removed: [] }),
    pages: read('pages.json', { added: [] }),
  };
}

/**
 * Everything the gate checks for one locale. Mirrors src/__tests__/translations.test.ts.
 */
function checkLocale(locale, translations, lock, pending, mode) {
  const en = translations.en;
  const loc = translations[locale];
  const englishFirst = mode === 'english-first';
  const added = new Set(englishFirst ? pending.keys.added : []);
  const removed = new Set(englishFirst ? pending.keys.removed : []);

  const missing = Object.keys(en).filter(k => !(k in loc) && !added.has(k));
  const extra = Object.keys(loc).filter(k => !(k in en) && !removed.has(k));
  const stale = [];
  const unconfirmed = [];
  const identical = [];
  for (const key of Object.keys(en)) {
    if (!(key in loc)) continue;
    if (!added.has(key)) {
      if (!(key in lock.keys)) unconfirmed.push(key);
      else if (lock.keys[key] !== hashValue(en[key])) stale.push(key);
    }
    if (loc[key] === en[key] && !lock.identicalApproved.includes(key)) identical.push(key);
  }
  const badApproved = lock.identicalApproved.filter(k => !(k in en) || loc[k] !== en[k]);
  const badPages = Object.entries(lock.pages).filter(([, st]) => !PAGE_STATUSES.includes(st)).map(([pg]) => pg);
  const machinePages = Object.entries(lock.pages).filter(([, st]) => st === 'machine').map(([pg]) => pg);
  return { missing, extra, stale, unconfirmed, identical, badApproved, badPages, machinePages };
}

/** Problems with the pending manifests themselves (mode-dependent). */
function checkPending(translations, pending, mode) {
  const problems = [];
  const { added, removed } = pending.keys;
  if (mode === 'strict') {
    if (added.length || removed.length) problems.push(`pending/keys.json is not empty (${added.length} added, ${removed.length} removed)`);
    if (pending.pages.added.length) problems.push(`pending/pages.json is not empty (${pending.pages.added.length} pages)`);
  } else {
    for (const k of added) if (!(k in translations.en)) problems.push(`pending/keys.json lists added key "${k}" that is not in en.ts`);
    for (const k of removed) if (k in translations.en) problems.push(`pending/keys.json lists removed key "${k}" that is still in en.ts`);
  }
  return problems;
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
  const isNewKey = oldValue === undefined;
  translations[locale][key] = value;

  // Use surgical update for existing keys, full rewrite for new keys
  writeTranslationFile(locale, translations[locale], isNewKey ? null : key);

  if (isNewKey) {
    console.log(c.success(`\nAdded ${c.key(key)} to ${c.locale(locale)}:`));
  } else {
    console.log(c.success(`\nUpdated ${c.key(key)} in ${c.locale(locale)}:`));
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
    if (locale !== 'en' && fs.existsSync(lockPath(locale))) {
      const lock = loadLock(locale);
      delete lock.keys[key];
      lock.identicalApproved = lock.identicalApproved.filter(k => k !== key);
      saveLock(locale, lock, Object.keys(translations.en));
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
 * Audit translations: missing, extra, stale, unconfirmed and untranslated entries.
 * Exits 1 when anything is wrong. I18N_MODE selects strict (default) or english-first.
 */
function cmdAudit(args) {
  const targetLocale = args.find(a => !a.startsWith('--'));
  const mode = getMode();
  const translations = loadAllTranslations();
  const pending = loadPending();
  const englishKeys = new Set(Object.keys(translations.en));

  const locales = targetLocale
    ? [targetLocale]
    : Object.keys(translations).filter(l => l !== 'en');

  console.log(c.bright('\nTranslation Audit Report'));
  console.log(c.dim(`Master: en (${englishKeys.size} keys), mode: ${mode}\n`));

  const totals = { missing: 0, extra: 0, stale: 0, unconfirmed: 0, identical: 0, other: 0 };
  const show = (label, keys, mark) => {
    if (keys.length === 0) return;
    console.log(c.dim(`  ${label}:`));
    for (const key of keys.slice(0, 10)) console.log(`    ${mark} ${key}`);
    if (keys.length > 10) console.log(c.dim(`    ... and ${keys.length - 10} more`));
  };

  for (const locale of locales) {
    if (!translations[locale]) {
      console.error(c.error(`Locale "${locale}" not found`));
      totals.other++;
      continue;
    }

    const r = checkLocale(locale, translations, loadLock(locale), pending, mode);
    const other = r.badApproved.length + r.badPages.length + r.machinePages.length;
    const bad = r.missing.length + r.extra.length + r.stale.length + r.unconfirmed.length + r.identical.length + other;

    console.log(`${bad === 0 ? c.success('✓') : c.warning('!')} ${c.locale(locale.padEnd(8))} ` +
      `${r.missing.length} missing, ${r.extra.length} extra, ${r.stale.length} stale, ` +
      `${r.unconfirmed.length} unconfirmed, ${r.identical.length} untranslated`);
    show('Missing keys', r.missing, c.error('-'));
    show('Extra keys (not in English)', r.extra, c.warning('+'));
    show('Stale (English changed since the lock)', r.stale, c.warning('~'));
    show('Unconfirmed (no lock entry)', r.unconfirmed, c.warning('?'));
    show('Identical to English and not in identicalApproved', r.identical, c.warning('='));
    show('identicalApproved entries that are no longer identical', r.badApproved, c.warning('x'));
    show('Invalid page review statuses', r.badPages, c.error('x'));
    show('Pages still marked machine', r.machinePages, c.error('x'));
    if (bad > 0) console.log();

    totals.missing += r.missing.length;
    totals.extra += r.extra.length;
    totals.stale += r.stale.length;
    totals.unconfirmed += r.unconfirmed.length;
    totals.identical += r.identical.length;
    totals.other += other;
  }

  const pendingProblems = checkPending(translations, pending, mode);
  for (const problem of pendingProblems) console.log(c.error(`! ${problem}`));

  console.log(c.bright('\nSummary:'));
  console.log(`  Total missing: ${totals.missing}`);
  console.log(`  Total extra: ${totals.extra}`);
  console.log(`  Total stale: ${totals.stale}`);
  console.log(`  Total unconfirmed: ${totals.unconfirmed}`);
  console.log(`  Total untranslated: ${totals.identical}`);
  console.log(`  Other problems: ${totals.other + pendingProblems.length}`);

  const failed = Object.values(totals).some(n => n > 0) || pendingProblems.length > 0;
  if (failed) {
    console.log(c.error('\nAudit failed.'));
    process.exit(1);
  }
  console.log(c.success('\nAll translations are in sync!'));
}

/**
 * Record the current English hash for translated keys (after translating).
 *   lock <locale|--all> [--keys a,b] [--identical]
 * --identical rewrites identicalApproved from the locale's current English-identical values.
 */
function cmdLock(args) {
  const keysIdx = args.indexOf('--keys');
  const only = keysIdx >= 0 ? (args[keysIdx + 1] || '').split(',').filter(Boolean) : null;
  const identical = args.includes('--identical');
  const all = args.includes('--all');
  const target = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--keys');

  const translations = loadAllTranslations();
  const locales = all
    ? Object.keys(translations).filter(l => l !== 'en')
    : target ? [target] : [];
  if (locales.length === 0 || locales.some(l => l === 'en' || !translations[l])) {
    console.error(c.error('Error: give a non-English locale (or --all)'));
    console.log('Usage: i18n-manager lock <locale|--all> [--keys a,b] [--identical]');
    process.exit(1);
  }
  const enOrder = Object.keys(translations.en);

  for (const locale of locales) {
    const lock = loadLock(locale);
    const keys = only || enOrder;
    for (const key of keys) {
      if (!(key in translations.en)) throw new Error(`Key "${key}" is not in en.ts`);
      if (key in translations[locale]) lock.keys[key] = hashValue(translations.en[key]);
    }
    for (const key of Object.keys(lock.keys)) {
      if (!(key in translations.en) || !(key in translations[locale])) delete lock.keys[key];
    }
    if (identical) {
      lock.identicalApproved = enOrder.filter(k => k in translations[locale] && translations[locale][k] === translations.en[k]);
    }
    saveLock(locale, lock, enOrder);
    console.log(`${c.success('✓')} ${c.locale(locale.padEnd(8))} ${Object.keys(lock.keys).length} keys locked, ${lock.identicalApproved.length} identical approved`);
  }
}

/**
 * List stale (English changed) and unconfirmed (no lock entry) translations. Exit 1 when any.
 */
function cmdStale(args) {
  const mode = getMode();
  const translations = loadAllTranslations();
  const pending = loadPending();
  const targetLocale = args.find(a => !a.startsWith('--'));
  const locales = targetLocale ? [targetLocale] : Object.keys(translations).filter(l => l !== 'en');
  let total = 0;
  for (const locale of locales) {
    const r = checkLocale(locale, translations, loadLock(locale), pending, mode);
    for (const key of r.stale) console.log(`${locale}\tstale\t${key}`);
    for (const key of r.unconfirmed) console.log(`${locale}\tunconfirmed\t${key}`);
    total += r.stale.length + r.unconfirmed.length;
  }
  if (total > 0) process.exit(1);
}

/**
 * Drift report: English lines committed after the locale's line for the same key
 * (file history). Prints one block per stale key; --write <file> also saves it.
 */
function cmdDrift(args) {
  const writeIdx = args.indexOf('--write');
  const outFile = writeIdx >= 0 ? args[writeIdx + 1] : null;

  // Time each key's value last actually changed, from file history. Reorders and
  // reformats (same key, same value) do not count, which plain git blame would.
  const changeTimes = (locale) => {
    const file = path.join(I18N_DIR, `${locale}.ts`);
    const out = execSync(`git log --reverse --no-renames -p --format=COMMIT%ct -- "${file}"`, { encoding: 'utf-8', maxBuffer: 256 * 1024 * 1024 });
    const times = {};
    const values = {};
    let time = 0;
    for (const line of out.split('\n')) {
      if (line.startsWith('COMMIT')) { time = Number(line.slice(6)); continue; }
      const m = line.match(/^\+\s*'([^']+)':\s*(.*)$/);
      if (!m) continue;
      if (values[m[1]] !== m[2]) {
        values[m[1]] = m[2];
        times[m[1]] = time;
      }
    }
    return times;
  };

  const translations = loadAllTranslations();
  const enTimes = changeTimes('en');
  const locales = Object.keys(translations).filter(l => l !== 'en');
  const byKey = {};
  for (const locale of locales) {
    const times = changeTimes(locale);
    for (const key of Object.keys(translations.en)) {
      if (key in times && key in enTimes && enTimes[key] > times[key]) {
        (byKey[key] = byKey[key] || []).push(locale);
      }
    }
  }

  const keys = Object.keys(byKey);
  const lines = [
    '# Translation drift report (English value last changed after the locale value, from git history).',
    '# Generated by: npm run i18n drift -- --write tasks/baselines/translation-drift.txt',
    '# These keys are locked at today\'s English hash but their translations describe older copy.',
    '# T1-T6 retranslate them in W4a and re-lock.',
    '',
    `Stale keys: ${keys.length}`,
    '',
  ];
  for (const key of keys) {
    const when = new Date(enTimes[key] * 1000).toISOString().slice(0, 10);
    lines.push(`${key}\t(English last changed ${when})\t${byKey[key].length} locales: ${byKey[key].join(', ')}`);
  }
  lines.push('');
  const text = lines.join('\n');
  if (outFile) fs.writeFileSync(outFile, text);
  console.log(text);
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
  if (key in translations.en) {
    console.error(c.error(`Error: Key "${key}" already exists`));
    console.log(`Current value: ${translations.en[key]}`);
    process.exit(1);
  }

  // English only: append to en.ts. Locales are translated later; list the key in
  // src/i18n/pending/keys.json (added) while English-first work is in progress.
  const enFile = path.join(I18N_DIR, 'en.ts');
  const escaped = englishValue.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');
  const content = fs.readFileSync(enFile, 'utf-8');
  const closing = content.lastIndexOf('} as const;');
  if (closing < 0) throw new Error('Could not find the closing "} as const;" in en.ts');
  fs.writeFileSync(enFile, `${content.slice(0, closing)}  '${key}': '${escaped}',\n${content.slice(closing)}`);
  console.log(c.success(`Added "${key}" to en: ${englishValue}`));
  console.log(c.warning('Locale files were not touched. Translate the key, then run `lock`; until then list it in src/i18n/pending/keys.json (added).'));
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
    if (locale !== 'en' && fs.existsSync(lockPath(locale))) {
      const lock = loadLock(locale);
      if (oldKey in lock.keys) {
        lock.keys[newKey] = lock.keys[oldKey];
        delete lock.keys[oldKey];
      }
      lock.identicalApproved = lock.identicalApproved.map(k => (k === oldKey ? newKey : k));
      saveLock(locale, lock, Object.keys(translations.en));
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
 * Report how locale files differ from the English master. Never writes English values
 * into locale files. --prune removes keys that English no longer has.
 */
function cmdSync(args) {
  const targetLocale = args.find(a => !a.startsWith('--'));
  const prune = args.includes('--prune');

  const translations = loadAllTranslations();
  const englishKeys = new Set(Object.keys(translations.en));
  const locales = targetLocale
    ? [targetLocale]
    : Object.keys(translations).filter(l => l !== 'en');

  console.log(c.bright('\nComparing with English master...\n'));

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

    if (missing.length === 0 && extra.length === 0) {
      console.log(`${c.success('✓')} ${c.locale(locale)} - in sync`);
      continue;
    }
    if (missing.length > 0) {
      console.log(`${c.error('-')} ${c.locale(locale)} - ${missing.length} keys need translating`);
      for (const key of missing.slice(0, 3)) console.log(`    ${c.dim('-')} ${key}`);
      if (missing.length > 3) console.log(`    ${c.dim('...')} and ${missing.length - 3} more`);
    }
    if (extra.length > 0) {
      console.log(`${c.warning('+')} ${c.locale(locale)} - ${extra.length} keys not in English${prune ? ' (removing)' : ''}`);
      for (const key of extra.slice(0, 3)) console.log(`    ${c.dim('+')} ${key}`);
      if (extra.length > 3) console.log(`    ${c.dim('...')} and ${extra.length - 3} more`);
      if (prune) {
        for (const key of extra) delete translations[locale][key];
        writeTranslationFile(locale, translations[locale]);
      }
    }
    totalMissing += missing.length;
    totalExtra += extra.length;
  }

  console.log();
  console.log(`${totalMissing} missing, ${totalExtra} extra. Missing keys must be translated by hand; sync never copies English into locale files.`);
}

/**
 * Show uncommitted changes to translation files
 * Two modes:
 *   1. Summary mode (default): List unique keys that changed across all locales
 *   2. Detail mode (with --key): Show changes for a specific key across all locales
 */
function cmdDiff(args) {
  const showStaged = args.includes('--staged');
  const showUnstaged = args.includes('--unstaged');
  const keyIndex = args.indexOf('--key');
  const keyFilter = keyIndex !== -1 ? args[keyIndex + 1] : null;

  // Default to showing both if neither specified
  const showBoth = !showStaged && !showUnstaged;

  // Get git diff output
  const diffOutput = getGitDiff(showBoth, showStaged, showUnstaged);

  if (!diffOutput.trim()) {
    console.log(c.success('\nNo uncommitted changes to translation files.'));
    return;
  }

  // Parse the diff output
  const changes = parseDiffOutput(diffOutput);

  if (keyFilter) {
    // Detail mode: show changes for a specific key across all locales
    showKeyDetail(keyFilter, changes);
  } else {
    // Summary mode: show aggregated list of changed keys
    showKeysSummary(changes);
  }
}

/**
 * Get git diff output for i18n files
 */
function getGitDiff(showBoth, showStaged, showUnstaged) {
  let diffOutput = '';
  try {
    if (showBoth || showUnstaged) {
      const unstaged = execSync(`git diff -- "src/i18n/*.ts"`, {
        cwd: path.join(__dirname, '..'),
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024
      });
      if (unstaged) diffOutput += unstaged;
    }
    if (showBoth || showStaged) {
      const staged = execSync(`git diff --cached -- "src/i18n/*.ts"`, {
        cwd: path.join(__dirname, '..'),
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024
      });
      if (staged) diffOutput += staged;
    }
  } catch (error) {
    if (error.status === 128) {
      console.error(c.error('Error: Not a git repository'));
      process.exit(1);
    }
    console.error(c.error(`Git error: ${error.message}`));
    process.exit(1);
  }
  return diffOutput;
}

/**
 * Show aggregated summary of all changed keys
 */
function showKeysSummary(changes) {
  console.log(c.bright('\nUncommitted Translation Changes\n'));

  // Aggregate keys across all locales
  const addedKeys = new Map();    // key -> { locales: [], englishValue: string }
  const modifiedKeys = new Map(); // key -> { locales: [], englishOld: string, englishNew: string }
  const removedKeys = new Map();  // key -> { locales: [], englishValue: string }

  for (const [locale, localeChanges] of Object.entries(changes)) {
    for (const { key, newValue } of localeChanges.added) {
      if (!addedKeys.has(key)) {
        addedKeys.set(key, { locales: [], englishValue: null });
      }
      addedKeys.get(key).locales.push(locale);
      if (locale === 'en') {
        addedKeys.get(key).englishValue = newValue;
      }
    }

    for (const { key, oldValue, newValue } of localeChanges.modified) {
      if (!modifiedKeys.has(key)) {
        modifiedKeys.set(key, { locales: [], englishOld: null, englishNew: null });
      }
      modifiedKeys.get(key).locales.push(locale);
      if (locale === 'en') {
        modifiedKeys.get(key).englishOld = oldValue;
        modifiedKeys.get(key).englishNew = newValue;
      }
    }

    for (const { key, oldValue } of localeChanges.removed) {
      if (!removedKeys.has(key)) {
        removedKeys.set(key, { locales: [], englishValue: null });
      }
      removedKeys.get(key).locales.push(locale);
      if (locale === 'en') {
        removedKeys.get(key).englishValue = oldValue;
      }
    }
  }

  const totalKeys = addedKeys.size + modifiedKeys.size + removedKeys.size;
  const totalLocales = Object.keys(changes).length;

  console.log(c.info('Summary:'));
  console.log(`  ${c.success(`+${addedKeys.size}`)} keys added, ${c.warning(`~${modifiedKeys.size}`)} keys modified, ${c.error(`-${removedKeys.size}`)} keys removed`);
  console.log(`  ${totalLocales} locale(s) with changes\n`);

  // Show added keys
  if (addedKeys.size > 0) {
    console.log(c.success('Added Keys:'));
    for (const [key, data] of [...addedKeys.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      const localeCount = data.locales.length;
      const inEnglish = data.locales.includes('en');
      const statusBadge = inEnglish ? '' : c.warning(' (not in en)');
      console.log(`  ${c.success('+')} ${c.key(key)} ${c.dim(`[${localeCount} locale${localeCount !== 1 ? 's' : ''}]`)}${statusBadge}`);
      if (data.englishValue) {
        const preview = data.englishValue.length > 70 ? data.englishValue.substring(0, 70) + '...' : data.englishValue;
        console.log(`      ${c.dim('en: ' + preview)}`);
      }
    }
    console.log();
  }

  // Show modified keys
  if (modifiedKeys.size > 0) {
    console.log(c.warning('Modified Keys:'));
    for (const [key, data] of [...modifiedKeys.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      const localeCount = data.locales.length;
      console.log(`  ${c.warning('~')} ${c.key(key)} ${c.dim(`[${localeCount} locale${localeCount !== 1 ? 's' : ''}]`)}`);
      if (data.englishOld && data.englishNew) {
        const oldPreview = data.englishOld.length > 60 ? data.englishOld.substring(0, 60) + '...' : data.englishOld;
        const newPreview = data.englishNew.length > 60 ? data.englishNew.substring(0, 60) + '...' : data.englishNew;
        console.log(`      ${c.dim('was: ' + oldPreview)}`);
        console.log(`      ${c.dim('now: ' + newPreview)}`);
      }
    }
    console.log();
  }

  // Show removed keys
  if (removedKeys.size > 0) {
    console.log(c.error('Removed Keys:'));
    for (const [key, data] of [...removedKeys.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      const localeCount = data.locales.length;
      console.log(`  ${c.error('-')} ${c.key(key)} ${c.dim(`[${localeCount} locale${localeCount !== 1 ? 's' : ''}]`)}`);
      if (data.englishValue) {
        const preview = data.englishValue.length > 70 ? data.englishValue.substring(0, 70) + '...' : data.englishValue;
        console.log(`      ${c.dim('en: ' + preview)}`);
      }
    }
    console.log();
  }

  console.log(c.dim(`Tip: Use ${c.info('npm run i18n diff -- --key <key>')} to see detailed changes for a specific key`));
}

/**
 * Show detailed changes for a specific key across all locales
 */
function showKeyDetail(keyFilter, changes) {
  console.log(c.bright(`\nChanges for key: ${c.key(keyFilter)}\n`));

  // Load current translations for reference
  const currentTranslations = loadAllTranslations();
  const englishCurrent = currentTranslations.en?.[keyFilter];

  // Collect changes for this key
  const keyChanges = {
    added: [],    // { locale, newValue }
    modified: [], // { locale, oldValue, newValue }
    removed: []   // { locale, oldValue }
  };

  for (const [locale, localeChanges] of Object.entries(changes)) {
    for (const change of localeChanges.added) {
      if (change.key === keyFilter) {
        keyChanges.added.push({ locale, newValue: change.newValue });
      }
    }
    for (const change of localeChanges.modified) {
      if (change.key === keyFilter) {
        keyChanges.modified.push({ locale, oldValue: change.oldValue, newValue: change.newValue });
      }
    }
    for (const change of localeChanges.removed) {
      if (change.key === keyFilter) {
        keyChanges.removed.push({ locale, oldValue: change.oldValue });
      }
    }
  }

  const totalChanges = keyChanges.added.length + keyChanges.modified.length + keyChanges.removed.length;

  if (totalChanges === 0) {
    console.log(c.warning(`No uncommitted changes found for key "${keyFilter}"`));
    return;
  }

  // Show current English value as reference
  if (englishCurrent) {
    console.log(c.info('Current English (reference):'));
    console.log(`  ${englishCurrent}\n`);
  }

  // Sort helper - en first, then alphabetically
  const sortLocales = (a, b) => {
    if (a.locale === 'en') return -1;
    if (b.locale === 'en') return 1;
    return a.locale.localeCompare(b.locale);
  };

  // Show added
  if (keyChanges.added.length > 0) {
    console.log(c.success(`Added in ${keyChanges.added.length} locale(s):`));
    for (const { locale, newValue } of keyChanges.added.sort(sortLocales)) {
      console.log(`  ${c.locale(locale.padEnd(8))} ${newValue}`);
    }
    console.log();
  }

  // Show modified
  if (keyChanges.modified.length > 0) {
    console.log(c.warning(`Modified in ${keyChanges.modified.length} locale(s):`));
    for (const { locale, oldValue, newValue } of keyChanges.modified.sort(sortLocales)) {
      console.log(`  ${c.locale(locale)}`);
      console.log(`    ${c.error('- ' + oldValue)}`);
      console.log(`    ${c.success('+ ' + newValue)}`);
    }
    console.log();
  }

  // Show removed
  if (keyChanges.removed.length > 0) {
    console.log(c.error(`Removed from ${keyChanges.removed.length} locale(s):`));
    for (const { locale, oldValue } of keyChanges.removed.sort(sortLocales)) {
      console.log(`  ${c.locale(locale.padEnd(8))} ${c.dim(oldValue)}`);
    }
    console.log();
  }
}

/**
 * Parse git diff output into structured changes
 */
function parseDiffOutput(diffOutput) {
  const changes = {};
  const lines = diffOutput.split('\n');

  let currentLocale = null;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Detect file being diffed
    if (line.startsWith('diff --git')) {
      const match = line.match(/b\/src\/i18n\/([^.]+)\.ts/);
      if (match) {
        currentLocale = match[1];
        if (currentLocale !== 'index') {
          if (!changes[currentLocale]) {
            changes[currentLocale] = { added: [], modified: [], removed: [] };
          }
        } else {
          currentLocale = null;
        }
      }
      i++;
      continue;
    }

    // Skip non-change lines
    if (!currentLocale || !line.startsWith('-') && !line.startsWith('+')) {
      i++;
      continue;
    }

    // Skip diff headers
    if (line.startsWith('---') || line.startsWith('+++')) {
      i++;
      continue;
    }

    // Parse removed line
    if (line.startsWith('-')) {
      const removed = parseTranslationLine(line.substring(1));
      if (removed) {
        // Look ahead for a matching addition (modification)
        let foundMatch = false;
        for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
          if (lines[j].startsWith('+')) {
            const added = parseTranslationLine(lines[j].substring(1));
            if (added && added.key === removed.key) {
              // This is a modification
              changes[currentLocale].modified.push({
                key: removed.key,
                oldValue: removed.value,
                newValue: added.value
              });
              // Mark this line as processed by skipping ahead
              lines[j] = '  ' + lines[j].substring(1); // Neutralize the + line
              foundMatch = true;
              break;
            }
          } else if (!lines[j].startsWith('-') && lines[j].trim()) {
            break; // Stop looking if we hit a context line
          }
        }
        if (!foundMatch) {
          changes[currentLocale].removed.push({
            key: removed.key,
            oldValue: removed.value
          });
        }
      }
    }
    // Parse added line
    else if (line.startsWith('+')) {
      const added = parseTranslationLine(line.substring(1));
      if (added) {
        // Check if this was already processed as a modification
        const alreadyModified = changes[currentLocale].modified.some(m => m.key === added.key);
        if (!alreadyModified) {
          changes[currentLocale].added.push({
            key: added.key,
            newValue: added.value
          });
        }
      }
    }

    i++;
  }

  return changes;
}

/**
 * Parse a single translation line from a diff
 */
function parseTranslationLine(line) {
  // Match: 'key': 'value' or 'key': "value"
  const singleQuoteMatch = line.match(/^\s*'([^']+)':\s*'((?:[^'\\]|\\.)*)'/);
  const doubleQuoteMatch = line.match(/^\s*'([^']+)':\s*"((?:[^"\\]|\\.)*)"/);

  if (singleQuoteMatch) {
    return {
      key: singleQuoteMatch[1],
      value: singleQuoteMatch[2].replace(/\\'/g, "'")
    };
  }
  if (doubleQuoteMatch) {
    return {
      key: doubleQuoteMatch[1],
      value: doubleQuoteMatch[2].replace(/\\"/g, '"')
    };
  }
  return null;
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
    set <key> <locale> <value>  Set/add a translation for a specific locale
    add-key <key> <en-value>    Add a new key to en.ts only
    rename-key <old> <new>      Rename a key across all languages
    delete <key> [--force]      Delete a key from all languages

  ${c.bright('Analysis:')}
    audit [locale]              Missing, extra, stale and untranslated keys; exits 1 on any
    stale [locale]              List stale/unconfirmed translations; exits 1 on any
    drift [--write <file>]      Keys whose English changed after the locale's line (file history)
    lock <locale|--all> [--keys a,b] [--identical]
                                Record English hashes after translating
    compare <locale1> <locale2> Compare two languages side by side
    stats                       Show translation statistics
    find-unused                 Find potentially unused keys

  ${c.bright('Bulk Operations:')}
    sync [locale] [--prune]     Report drift from English (--prune drops extra keys; never copies English)
    export [json|csv] [file]    Export translations
    import <file> [locale]      Import translations from JSON

  ${c.bright('Git Integration:')}
    diff [--staged] [--unstaged]            List all changed keys (aggregated)
    diff --key <key>                         Show changes for a specific key across locales

${c.info('Environment:')}
    I18N_MODE=strict|english-first   strict (default) requires empty pending manifests

${c.info('Examples:')}
    npm run i18n list "pricing.*"
    npm run i18n get header.logoText
    npm run i18n set header.logoText de "Seite Dachs"
    npm run i18n search "split"
    npm run i18n audit ja
    npm run i18n compare en ja "features.*"
    npm run i18n sync -- --dry-run
    npm run i18n export json translations.json
    npm run i18n diff
    npm run i18n diff -- --key hero.title
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
  lock: cmdLock,
  stale: cmdStale,
  drift: cmdDrift,
  compare: cmdCompare,
  export: cmdExport,
  import: cmdImport,
  stats: cmdStats,
  'add-key': cmdAddKey,
  'rename-key': cmdRenameKey,
  'find-unused': cmdFindUnused,
  sync: cmdSync,
  diff: cmdDiff,
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

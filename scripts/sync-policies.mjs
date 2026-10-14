#!/usr/bin/env node
// Refresh the committed legal policy snapshots in src/content/policies/ from the app.
// Plan: tasks/restructure-marketing-site.md section 2.7 (D10).
import { appendFileSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_OUT = path.join(ROOT, 'src', 'content', 'policies');
const DEFAULT_ORIGIN = 'https://app.sidebadger.me';
const TIMEOUT_MS = 15_000;

/** The app's policy ids, which are also the snapshot file names. */
export const POLICY_IDS = ['privacy-policy', 'terms-of-service', 'cookie-policy'];

const USAGE = `Refresh the policy snapshots in src/content/policies/ from the app.

Usage: node scripts/sync-policies.mjs [options]
       npm run policies:sync -- [options]

Options:
  --origin URL   app origin to fetch from (default: ${DEFAULT_ORIGIN})
  --out DIR      snapshot directory (default: src/content/policies)
  --dry-run      fetch and validate everything, write nothing
  --log FILE     log file for per-request detail (default: a temp file)
  --selftest     run the built-in checks of the parsing and validation helpers
  --help         show this message

Example: npm run policies:sync -- --dry-run

Each policy needs <origin>/api/policies/<id>/current (version hash, createdAt) and
<origin>/api/policies/<id>/text (Markdown). Any failure exits 1 and leaves every
snapshot untouched. Raw HTML and javascript:, vbscript: or data: links are
rejected, because Astro's Markdown pipeline passes them through unsanitized. An unchanged policy keeps its file, so fetchedAt only moves
when the text or version changes.

Exit codes: 0 success (changed or not), 1 fetch or validation failure, 2 bad usage.
Console shows progress and a summary; request detail is in the log file.
`;

function fail(code, message) {
  process.stderr.write(`${message}\n`);
  process.exit(code);
}

function parseArgs(argv) {
  const opts = { origin: DEFAULT_ORIGIN, out: DEFAULT_OUT, dryRun: false, log: undefined, selftest: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const value = () => {
      const next = argv[++i];
      if (next === undefined || next.startsWith('--')) fail(2, `${arg} needs a value\n\n${USAGE}`);
      return next;
    };
    if (arg === '--help' || arg === '-h') {
      process.stdout.write(USAGE);
      process.exit(0);
    } else if (arg === '--dry-run') opts.dryRun = true;
    else if (arg === '--selftest') opts.selftest = true;
    else if (arg === '--origin') opts.origin = value();
    else if (arg === '--out') opts.out = path.resolve(value());
    else if (arg === '--log') opts.log = path.resolve(value());
    else fail(2, `Unknown option: ${arg}\n\n${USAGE}`);
  }
  try {
    const url = new URL(opts.origin);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('protocol');
    opts.origin = url.origin;
  } catch {
    fail(2, `--origin must be an http(s) URL, got "${opts.origin}"`);
  }
  return opts;
}

async function get(url, log) {
  const started = Date.now();
  let res;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), redirect: 'follow' });
  } catch (err) {
    const reason = err.name === 'TimeoutError' ? `timed out after ${TIMEOUT_MS / 1000}s` : err.message;
    throw new Error(`${url}: request failed (${reason})`);
  }
  log(`GET ${url} -> ${res.status} ${res.headers.get('content-type')} in ${Date.now() - started}ms`);
  if (res.status !== 200) throw new Error(`${url}: expected status 200, got ${res.status}`);
  return res;
}

/** The leading level-1 heading goes, because the page renders its own h1. Other headings stay. */
export function stripLeadingHeading(text) {
  return text.replace(/^\s*#[ \t]+[^\n]*\n+/, '');
}

const UNSAFE_MARKDOWN = [
  // A raw HTML tag or comment. Autolinks such as <https://…> and <a@b.c> do not match.
  { re: /<!--|<\/?[A-Za-z][A-Za-z0-9-]*(?:\s[^>]*)?\/?>/, what: 'raw HTML' },
  // An inline link, reference definition or autolink with a script-capable scheme
  { re: /(?:\]\(\s*<?|^\s*\[[^\]]+\]:\s*<?|<)\s*(?:javascript|vbscript|data):/im, what: 'an unsafe link scheme' },
];

/**
 * Astro renders snapshots with raw HTML allowed and no URL sanitizing, and the page ships no
 * DOMPurify, so the sync refuses anything that would reach the HTML unescaped.
 * Returns a description of the first problem, or undefined when the Markdown is safe.
 */
export function findUnsafeMarkdown(markdown) {
  for (const { re, what } of UNSAFE_MARKDOWN) {
    const match = markdown.match(re);
    if (match) return `${what} at "${match[0].trim().slice(0, 40)}"`;
  }
  return undefined;
}

export function renderSnapshot({ policyId, sourceUrl, versionHash, publishedAt, fetchedAt }, body) {
  const q = value => JSON.stringify(value);
  return [
    '---',
    `policyId: ${q(policyId)}`,
    `sourceUrl: ${q(sourceUrl)}`,
    `versionHash: ${q(versionHash)}`,
    `publishedAt: ${q(publishedAt)}`,
    `fetchedAt: ${q(fetchedAt)}`,
    '---',
    '',
    body.trim(),
    '',
  ].join('\n');
}

async function fetchPolicy(origin, policyId, log) {
  const base = `${origin}/api/policies/${policyId}`;

  const currentRes = await get(`${base}/current`, log);
  const current = await currentRes.json().catch(() => {
    throw new Error(`${base}/current: response is not JSON`);
  });
  const { currentVersionHash: versionHash, createdAt } = current ?? {};
  if (typeof versionHash !== 'string' || !versionHash) throw new Error(`${base}/current: no currentVersionHash`);
  const published = new Date(createdAt);
  if (typeof createdAt !== 'string' || Number.isNaN(published.getTime())) {
    throw new Error(`${base}/current: createdAt "${createdAt}" is not a date`);
  }

  const textRes = await get(`${base}/text`, log);
  const contentType = textRes.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().startsWith('text/plain')) {
    throw new Error(`${base}/text: expected text/plain, got "${contentType}"`);
  }
  const body = stripLeadingHeading(await textRes.text()).trim();
  if (!body) throw new Error(`${base}/text: body is empty`);
  // The app's text has no level-1 heading today, only `##` sections, so any heading will do
  if (!/^#{1,6}[ \t]/m.test(body)) throw new Error(`${base}/text: no Markdown headings, so it is not a policy`);
  const unsafe = findUnsafeMarkdown(body);
  if (unsafe) throw new Error(`${base}/text: contains ${unsafe}`);

  return { policyId, sourceUrl: `${base}/text`, versionHash, publishedAt: published.toISOString(), body };
}

export function readExisting(file) {
  try {
    const raw = readFileSync(file, 'utf8');
    const match = raw.match(/^---\n([\s\S]*?)\n---\n\n([\s\S]*)$/);
    if (!match) return undefined;
    const fetchedAt = match[1].match(/^fetchedAt: "(.*)"$/m)?.[1];
    return { fetchedAt, body: match[2].trim(), raw };
  } catch {
    return undefined;
  }
}

function selftest() {
  const cases = [
    ['strips a leading h1', stripLeadingHeading('# Privacy\n\n## One\n') === '## One\n'],
    ['keeps a leading h2', stripLeadingHeading('## One\ntext') === '## One\ntext'],
    ['accepts plain policy Markdown', findUnsafeMarkdown('## A\n\n**B** [c](https://x.y/z) <https://x.y> <a@b.c> 5 < 6') === undefined],
    ['rejects a script tag', findUnsafeMarkdown('## A\n<script>alert(1)</script>') !== undefined],
    ['rejects an img tag', findUnsafeMarkdown('## A\n<img src=x onerror=alert(1)>') !== undefined],
    ['rejects an HTML comment', findUnsafeMarkdown('## A\n<!-- x -->') !== undefined],
    ['rejects a javascript: link', findUnsafeMarkdown('## A\n[x]( javascript:alert(1))') !== undefined],
    ['rejects a data: reference', findUnsafeMarkdown('## A\n\n[x]: <data:text/html,x>') !== undefined],
    ['rejects a vbscript: autolink', findUnsafeMarkdown('## A\n<vbscript:x>') !== undefined],
  ];
  const dir = mkdtempSync(path.join(tmpdir(), 'sync-policies-selftest-'));
  try {
    const meta = { policyId: 'cookie-policy', sourceUrl: 'https://x.y/t', versionHash: 'h', publishedAt: 'p', fetchedAt: 'f' };
    writeFileSync(path.join(dir, 'a.md'), renderSnapshot(meta, '## A\n\nb\n'));
    const back = readExisting(path.join(dir, 'a.md'));
    cases.push(['reads back its own snapshot', back?.fetchedAt === 'f' && back?.body === '## A\n\nb']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  const failed = cases.filter(([, ok]) => !ok);
  for (const [name] of failed) process.stderr.write(`FAIL ${name}\n`);
  process.stdout.write(`Selftest: ${cases.length - failed.length} of ${cases.length} passed.\n`);
  process.exit(failed.length ? 1 : 0);
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.selftest) selftest();
  const started = Date.now();
  const logFile = opts.log ?? path.join(mkdtempSync(path.join(tmpdir(), 'sync-policies-')), 'sync.log');
  mkdirSync(path.dirname(logFile), { recursive: true });
  const log = line => appendFileSync(logFile, `${new Date().toISOString()} ${line}\n`);
  process.stdout.write(`Log: ${logFile}\n`);

  const fetchedAt = new Date().toISOString();
  const planned = [];
  try {
    for (const policyId of POLICY_IDS) {
      process.stdout.write(`Fetching ${policyId} from ${opts.origin}\n`);
      const policy = await fetchPolicy(opts.origin, policyId, log);
      const file = path.join(opts.out, `${policyId}.md`);
      const existing = readExisting(file);
      const unchanged =
        existing !== undefined &&
        existing.fetchedAt !== undefined &&
        existing.body === policy.body &&
        existing.raw.includes(`versionHash: "${policy.versionHash}"`) &&
        existing.raw.includes(`publishedAt: "${policy.publishedAt}"`);
      const content = renderSnapshot({ ...policy, fetchedAt: unchanged ? existing.fetchedAt : fetchedAt }, policy.body);
      planned.push({ policyId, file, content, status: !existing ? 'new' : unchanged ? 'unchanged' : 'changed' });
    }
  } catch (err) {
    log(`FAILED ${err.message}`);
    fail(1, `Sync failed, no snapshot was touched: ${err.message}\nDetail: ${logFile}`);
  }

  const changed = planned.filter(p => p.status !== 'unchanged');
  if (!opts.dryRun && changed.length > 0) {
    mkdirSync(opts.out, { recursive: true });
    // Stage every file first so a write failure cannot leave a mix of old and new snapshots
    const staged = changed.map(p => ({ ...p, tmp: `${p.file}.tmp-${process.pid}` }));
    try {
      for (const p of staged) writeFileSync(p.tmp, p.content);
      for (const p of staged) renameSync(p.tmp, p.file);
    } catch (err) {
      for (const p of staged) rmSync(p.tmp, { force: true });
      fail(1, `Writing snapshots failed: ${err.message}`);
    }
  }

  for (const p of planned) process.stdout.write(`  ${p.policyId}: ${p.status}\n`);
  const took = `${((Date.now() - started) / 1000).toFixed(1)}s`;
  process.stdout.write(
    opts.dryRun
      ? `Dry run: ${changed.length} of ${planned.length} would change, nothing written (${took}). Log: ${logFile}\n`
      : `Done: ${changed.length} of ${planned.length} written (${took}). Log: ${logFile}\n`
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}

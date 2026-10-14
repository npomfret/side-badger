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
  --help         show this message

Each policy needs <origin>/api/policies/<id>/current (version hash, createdAt) and
<origin>/api/policies/<id>/text (Markdown). Any failure exits 1 and leaves every
snapshot untouched. An unchanged policy keeps its file, so fetchedAt only moves
when the text or version changes.

Exit codes: 0 success (changed or not), 1 fetch or validation failure, 2 bad usage.
Console shows progress and a summary; request detail is in the log file.
`;

function fail(code, message) {
  process.stderr.write(`${message}\n`);
  process.exit(code);
}

function parseArgs(argv) {
  const opts = { origin: DEFAULT_ORIGIN, out: DEFAULT_OUT, dryRun: false, log: undefined };
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

  return { policyId, sourceUrl: `${base}/text`, versionHash, publishedAt: published.toISOString(), body };
}

function readExisting(file) {
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

async function main() {
  const opts = parseArgs(process.argv.slice(2));
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
  process.stdout.write(
    opts.dryRun
      ? `Dry run: ${changed.length} of ${planned.length} would change, nothing written.\n`
      : `Done: ${changed.length} of ${planned.length} written.\n`
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}

import assert from 'node:assert/strict';
import { setTimeout } from 'node:timers/promises';

const base = new URL(process.argv[2] ?? 'http://127.0.0.1:18200');
let checks = 0;
async function request(path, accept = '', options = {}) {
  // Also usable through the shared edge's 20 requests/second limit.
  await setTimeout(75);
  return fetch(new URL(path, base), { redirect: 'manual', signal: AbortSignal.timeout(10_000), ...options, headers: { Accept: accept, ...options.headers } });
}
function check(condition, label) {
  assert.ok(condition, label);
  checks++;
}
function varies(response) {
  return (response.headers.get('vary') ?? '').toLowerCase().split(',').map(value => value.trim()).includes('accept');
}

// Sequential HTTP requests: exercise the actual parser and static file server, not a JS imitation.
for (const [accept, type] of [
  ['', 'html'], ['*/*', 'html'], ['text/*', 'html'],
  ['text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8', 'html'],
  ['text/markdown', 'markdown'], ['text/markdown, text/html, */*', 'markdown'],
  ['TEXT/MARKDOWN;Q=1.000', 'markdown'], ['text/markdown; charset=utf-8', 'markdown'],
  ['text/markdown;q=0', 'html'], ['text/markdown;q=0.000, */*', 'html'],
  ['text/markdown;q=0.8, text/html', 'html'], ['text/markdown;q=0.8, text/html;q=0.7', 'markdown'],
  ['text/html;q=0.8, text/markdown;q=0.8', 'markdown'],
  ['text/markdown;q=0.800, text/html;q=0.8', 'markdown'],
  ['text/markdown;q=0.9, text/html;q=0.89', 'markdown'],
  ['text/markdown;q=0.999, text/html;q=0.998', 'markdown'],
  ['text/markdown;q=0.001, text/html;q=0.002', 'html'],
  ['text/markdown;q=0.8, */*;q=0.9', 'html'],
  ['text/markdown;q=0.9, text/*;q=0.8', 'markdown'],
  ['text/markdown;q=0.2, text/html;q=0.1, text/*', 'markdown'],
  ['text/markdown;q=0.1, text/html;q=0, */*', 'markdown'],
  ['text/markdown;q=bogus, text/html', 'html'],
  ['text/markdown;q=1.001, text/html', 'html'],
  ['text/markdownish', 'html'],
]) {
  const response = await request('/pricing/', accept);
  const body = await response.text();
  check(response.status === 200, `${accept}: status ${response.status}`);
  check(response.headers.get('content-type')?.startsWith(`text/${type}`), `${accept}: ${response.headers.get('content-type')}`);
  check(varies(response), `${accept}: missing Vary: Accept`);
  check(type === 'markdown' ? body.startsWith('---\n') : /<!doctype html>/i.test(body), `${accept}: wrong body`);
}

for (const path of ['/', '/pricing/', '/ar/features/settle-up/']) {
  const response = await request(path, 'text/markdown');
  const body = await response.text();
  check(response.status === 200 && response.headers.get('content-type')?.includes('text/markdown'), `${path}: negotiated Markdown`);
  check(body.includes(`url: "https://sidebadger.me${path}"`), `${path}: canonical source metadata`);
  const explicit = await request(`${path}index.md`);
  check(explicit.status === 200 && (await explicit.text()) === body, `${path}: explicit alternate agrees`);
  check(explicit.headers.get('x-robots-tag') === 'noindex', `${path}: explicit alternate is noindex`);
  check(explicit.headers.get('link') === `<https://sidebadger.me${path}>; rel="canonical"`, `${path}: canonical HTTP link`);
  if (body.includes('robots: "noindex"')) {
    check(response.headers.get('x-robots-tag') === 'noindex', `${path}: preserves source noindex`);
  }
}

const html = await request('/pricing/', 'text/html');
await html.text();
const md = await request('/pricing/', 'text/markdown');
const markdown = await md.text();
const htmlEtag = html.headers.get('etag');
const markdownEtag = md.headers.get('etag');
check(Boolean(htmlEtag && markdownEtag && htmlEtag !== markdownEtag), 'HTML and Markdown have separate validators');
const same = await request('/pricing/', 'text/markdown', { headers: { 'If-None-Match': markdownEtag } });
check(same.status === 304 && varies(same), 'Markdown revalidation retains Vary');
const other = await request('/pricing/', 'text/markdown', { headers: { 'If-None-Match': htmlEtag } });
check(other.status === 200 && (await other.text()) === markdown, 'HTML validator cannot validate Markdown');
const head = await request('/pricing/', 'text/markdown', { method: 'HEAD' });
check(head.status === 200 && head.headers.get('content-type') === md.headers.get('content-type') && (await head.text()) === '', 'HEAD has Markdown metadata and no body');
check(head.headers.get('content-length') === md.headers.get('content-length'), 'HEAD reports selected representation length');

for (const [path, status, target] of [
  ['/pricing?x=1', 301, '/pricing/?x=1'], ['/pricing/index.html', 301, '/pricing/'],
  ['/en-gb/pricing/', 301, '/pricing/'], ['/nope/', 404], ['/nope/index.md', 404],
  ['/preview/feature/', 404], ['/preview/feature/index.md', 404],
  ['/go/app/', 302, 'https://app.sidebadger.me/dashboard'],
]) {
  const response = await request(path, 'text/markdown');
  check(response.status === status, `${path}: expected ${status}, got ${response.status}`);
  if (target) check(response.headers.get('location') === target, `${path}: redirect target`);
  if (status === 404) check(response.headers.get('content-type')?.includes('text/html'), `${path}: no synthetic Markdown page`);
  await response.text();
}
console.log(`Markdown HTTP checks passed: ${checks}`);

/**
 * The policy pages' only script. It fetches the current policy from the app API when the page opens, renders
 * it safely and handles loading, failure and retry. Nothing about the policy is known at build time.
 * The Markdown parser is a separate chunk, fetched alongside the request (never with this script).
 */
import { later, fill, ref } from '../tools/tool-dom';
import { POLICY_TIMEOUT_MS, boundedRequest, fetchPolicyDate, fetchPolicyText, type PolicyRequest } from './policy-source';
import { browserDom, toDom } from './policy-tree';

interface Strings {
  loading: string;
  error: string;
  updated: string;
}

const markdown = later(() => import('./policy-markdown'));

function formatDate(date: Date, intlCode: string): string {
  const options: Intl.DateTimeFormatOptions = { dateStyle: 'long', timeZone: 'UTC' };
  try {
    return new Intl.DateTimeFormat(intlCode, options).format(date);
  } catch {
    return new Intl.DateTimeFormat('en-US', options).format(date);
  }
}

function start(root: HTMLElement): void {
  const strings = JSON.parse(root.dataset.strings ?? '{}') as Strings;
  const request: PolicyRequest = {
    textUrl: root.dataset.textUrl ?? '',
    currentUrl: root.dataset.currentUrl ?? '',
  };
  const body = ref(root, 'body');
  const message = ref(root, 'message');
  const retry = ref<HTMLButtonElement>(root, 'retry');
  const updated = ref(root, 'updated');
  const time = ref<HTMLTimeElement>(root, 'time');
  let attempt = 0;
  let cancelPrevious: (() => void) | undefined;

  let published: Date | undefined;

  /** The date appears only beside text that is on screen, and only when the API gave one. */
  function showDate(): void {
    const date = published;
    if (!date || body.hidden) return;
    time.dateTime = date.toISOString();
    time.textContent = fill(strings.updated, { date: formatDate(date, root.dataset.intlCode ?? 'en-US') });
    updated.hidden = false;
  }

  function fail(): void {
    body.hidden = true;
    body.replaceChildren();
    body.setAttribute('aria-busy', 'false');
    message.textContent = strings.error;
    retry.hidden = false;
  }

  async function load(): Promise<void> {
    const mine = ++attempt;
    cancelPrevious?.();
    const bounded = boundedRequest(POLICY_TIMEOUT_MS);
    cancelPrevious = bounded.cancel;
    body.setAttribute('aria-busy', 'true');
    body.hidden = true;
    updated.hidden = true;
    published = undefined;
    retry.hidden = true;
    message.textContent = strings.loading;
    // The date is metadata only: it must never delay, or block, the text.
    void fetchPolicyDate(request, bounded.signal).then(date => {
      if (mine !== attempt) return;
      published = date;
      showDate();
    });
    try {
      const [text, parser] = await Promise.race([
        Promise.all([fetchPolicyText(request, bounded.signal), markdown.fetch()]),
        bounded.aborted,
      ]);
      const nodes = parser.renderPolicyMarkdown(text, { idPrefix: 'policy-h', titleId: 'policy-title' });
      if (!nodes) throw new Error('malformed: nothing to show');
      if (mine !== attempt) return;
      body.replaceChildren();
      toDom(nodes, browserDom, body);
      body.hidden = false;
      body.setAttribute('aria-busy', 'false');
      // After Try again, focus was on the message; keep it on the page rather than an empty element
      if (document.activeElement === message) body.focus({ preventScroll: true });
      message.textContent = '';
      showDate();
    } catch {
      // Every failure (HTTP, network, timeout, empty, malformed) shows the same message
      if (mine !== attempt) return;
      fail();
    } finally {
      bounded.done();
    }
  }

  retry.addEventListener('click', () => {
    message.focus();
    void load();
  });
  void load();
}

document.querySelectorAll<HTMLElement>('[data-policy]').forEach(start);

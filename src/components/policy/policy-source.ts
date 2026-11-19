/**
 * Fetching a policy from the app API in the browser. The app owns the policies; this site keeps no copy and
 * the build never calls the API. `/text` is the Markdown body; `/current` carries the publication date.
 */

export const POLICY_TIMEOUT_MS = 10_000;

export type PolicyFailure = 'http' | 'network' | 'timeout' | 'empty' | 'malformed';

export class PolicyError extends Error {
  constructor(
    readonly kind: PolicyFailure,
    detail?: string
  ) {
    super(detail ? `${kind}: ${detail}` : kind);
  }
}

type Fetch = (input: string, init?: RequestInit) => Promise<Response>;

export interface PolicyRequest {
  textUrl: string;
  currentUrl: string;
  fetch?: Fetch;
  timeoutMs?: number;
}

/**
 * A request bounded by one timeout. The timer covers connecting and reading the body, and the caller can
 * also cancel (a newer attempt supersedes this one). Either aborts the fetches that share the signal.
 */
export function boundedRequest(timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  // Rejects when the request is aborted, so work that ignores the signal (loading a script chunk) is bounded too.
  const aborted = new Promise<never>((_resolve, reject) =>
    controller.signal.addEventListener('abort', () => reject(new PolicyError('timeout')), { once: true })
  );
  aborted.catch(() => {});
  return {
    signal: controller.signal,
    aborted,
    cancel: () => controller.abort(),
    done: () => clearTimeout(timer),
  };
}

/** Fetch the policy Markdown. Anything that is not a non-empty Markdown/plain-text 200 is a failure. */
export async function fetchPolicyText(request: PolicyRequest, signal: AbortSignal): Promise<string> {
  const doFetch = request.fetch ?? ((input, init) => fetch(input, init));
  // No custom headers, so the browser sends no preflight (the API's CORS allows only a few named headers).
  const response = await doFetch(request.textUrl, { signal, credentials: 'omit' });
  if (!response.ok) throw new PolicyError('http', String(response.status));
  const type = (response.headers.get('content-type') ?? '').toLowerCase();
  if (type.includes('json') || type.includes('html') || type.includes('xml')) throw new PolicyError('malformed', type);
  const body = await response.text();
  if (!body.trim()) throw new PolicyError('empty');
  if (body.length > 1_000_000 || body.includes('\u0000')) throw new PolicyError('malformed', 'unusable body');
  return body;
}

/** The publication date from `/current`, or undefined when the metadata is missing or not a plausible date. */
export async function fetchPolicyDate(request: PolicyRequest, signal: AbortSignal): Promise<Date | undefined> {
  const doFetch = request.fetch ?? ((input, init) => fetch(input, init));
  try {
    const response = await doFetch(request.currentUrl, { signal, credentials: 'omit' });
    if (!response.ok) return undefined;
    const data: unknown = await response.json();
    const createdAt = typeof data === 'object' && data !== null ? (data as { createdAt?: unknown }).createdAt : undefined;
    if (typeof createdAt !== 'string') return undefined;
    const date = new Date(createdAt);
    const year = date.getUTCFullYear();
    return Number.isNaN(date.getTime()) || year < 2020 || year > 2100 ? undefined : date;
  } catch {
    return undefined;
  }
}

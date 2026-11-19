import { describe, expect, it, vi } from 'vitest';
import { PolicyError, boundedRequest, fetchPolicyDate, fetchPolicyText, type PolicyRequest } from './policy-source';

const reply = (body: string, init: ResponseInit = {}) =>
  new Response(body, { status: 200, headers: { 'content-type': 'text/plain; charset=utf-8' }, ...init });

const request = (fetcher: PolicyRequest['fetch']): PolicyRequest => ({
  textUrl: 'https://app.example/api/policies/x/text',
  currentUrl: 'https://app.example/api/policies/x/current',
  fetch: fetcher,
});

const signal = () => new AbortController().signal;

describe('fetchPolicyText', () => {
  it('returns the Markdown body of a 200', async () => {
    await expect(fetchPolicyText(request(async () => reply('## Hi')), signal())).resolves.toBe('## Hi');
  });

  it('sends a credential-free request with no custom headers (no CORS preflight)', async () => {
    const fetcher = vi.fn(async (_url: string, _init?: RequestInit) => reply('x'));
    await fetchPolicyText(request(fetcher), signal());
    expect(fetcher.mock.calls[0][1]).toMatchObject({ credentials: 'omit' });
    expect(fetcher.mock.calls[0][1]).not.toHaveProperty('headers');
  });

  it.each([500, 503, 404])('fails with an http error for status %i', async status => {
    await expect(fetchPolicyText(request(async () => reply('boom', { status })), signal())).rejects.toMatchObject({ kind: 'http' });
  });

  it('fails when the request itself fails', async () => {
    await expect(
      fetchPolicyText(request(async () => Promise.reject(new TypeError('Failed to fetch'))), signal())
    ).rejects.toThrow('Failed to fetch');
  });

  it.each(['', '   \n\t '])('treats an empty body (%j) as a failure', async body => {
    await expect(fetchPolicyText(request(async () => reply(body)), signal())).rejects.toMatchObject({ kind: 'empty' });
  });

  it.each(['application/json', 'text/html; charset=utf-8', 'application/xml'])('treats a %s response as malformed', async type => {
    const fetcher = async () => reply('{"error":"nope"}', { headers: { 'content-type': type } });
    await expect(fetchPolicyText(request(fetcher), signal())).rejects.toMatchObject({ kind: 'malformed' });
  });

  it('treats a body with NUL bytes or an absurd size as malformed', async () => {
    await expect(fetchPolicyText(request(async () => reply('a\u0000b')), signal())).rejects.toBeInstanceOf(PolicyError);
    await expect(fetchPolicyText(request(async () => reply('a'.repeat(1_000_001))), signal())).rejects.toMatchObject({ kind: 'malformed' });
  });
});

describe('fetchPolicyDate', () => {
  const json = (data: unknown) => async () => reply(JSON.stringify(data), { headers: { 'content-type': 'application/json' } });

  it('reads createdAt from the metadata', async () => {
    const date = await fetchPolicyDate(request(json({ createdAt: '2026-11-18T22:56:13.851Z' })), signal());
    expect(date?.toISOString()).toBe('2026-11-18T22:56:13.851Z');
  });

  it.each([{}, { createdAt: 5 }, { createdAt: 'yesterday' }, { createdAt: '1999-01-01' }, null, []])(
    'returns no date for %j',
    async data => {
      await expect(fetchPolicyDate(request(json(data)), signal())).resolves.toBeUndefined();
    }
  );

  it('returns no date when the metadata request fails or is not JSON', async () => {
    await expect(fetchPolicyDate(request(async () => reply('', { status: 500 })), signal())).resolves.toBeUndefined();
    await expect(fetchPolicyDate(request(async () => reply('not json')), signal())).resolves.toBeUndefined();
    await expect(fetchPolicyDate(request(async () => Promise.reject(new Error('down'))), signal())).resolves.toBeUndefined();
  });
});

describe('boundedRequest', () => {
  it('aborts after the timeout, which rejects `aborted` and the shared signal', async () => {
    vi.useFakeTimers();
    const bounded = boundedRequest(10_000);
    const outcome = expect(bounded.aborted).rejects.toMatchObject({ kind: 'timeout' });
    await vi.advanceTimersByTimeAsync(9_999);
    expect(bounded.signal.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(bounded.signal.aborted).toBe(true);
    await outcome;
    vi.useRealTimers();
  });

  it('does not abort once done, and cancel aborts at once', async () => {
    vi.useFakeTimers();
    const finished = boundedRequest(10_000);
    finished.done();
    await vi.advanceTimersByTimeAsync(20_000);
    expect(finished.signal.aborted).toBe(false);
    const cancelled = boundedRequest(10_000);
    cancelled.cancel();
    expect(cancelled.signal.aborted).toBe(true);
    cancelled.done();
    vi.useRealTimers();
  });
});

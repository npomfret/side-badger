import { describe, expect, it } from 'vitest';
import { referenceDocument } from '../../__tests__/fixtures/reference-document';
import { ReferenceLoader, type ReferenceRequest, type ReferenceState } from './reference-loader';
import { parseReference, type ApiReferenceDocument } from './reference-source';

function attempt() {
  const controller = new AbortController();
  const aborted = Promise.withResolvers<never>();
  return { signal: controller.signal, aborted: aborted.promise,
    cancel: () => { controller.abort(); aborted.reject(new Error('Cancelled')); },
    done: () => {}, timeout: () => { controller.abort(); aborted.reject(new Error('Timed out')); },
  };
}

describe('API reference loading', () => {
  it('discards a superseded response and a cancelled request cannot overwrite the new document', async () => {
    const first = Promise.withResolvers<ApiReferenceDocument>();
    const second = Promise.withResolvers<ApiReferenceDocument>();
    const pending = [first, second];
    const states: ReferenceState[] = [];
    const requests: ReferenceRequest[] = [];
    const loader = new ReferenceLoader({ load: () => pending.shift()!.promise },
      () => { const request = attempt(); requests.push(request); return request; }, state => states.push(state));
    const old = loader.load();
    const current = loader.load();
    expect(requests[0].signal.aborted).toBe(true);
    const newer = parseReference(referenceDocument(2));
    second.resolve(newer);
    await current;
    first.resolve(parseReference(referenceDocument(1)));
    await old;
    expect(states.map(state => state.kind)).toEqual(['loading', 'loading', 'ready']);
    expect(states.at(-1)).toEqual({ kind: 'ready', document: newer });
  });

  it('times out a hanging source, then permits a fresh successful retry', async () => {
    const request = attempt();
    const states: ReferenceState[] = [];
    const document = parseReference(referenceDocument(8));
    let first = true;
    const loader = new ReferenceLoader({ load: () => {
      if (first) { first = false; return new Promise(() => {}); }
      return Promise.resolve(document);
    } }, () => first ? request : attempt(), state => states.push(state));
    const waiting = loader.load();
    expect(states.at(-1)?.kind).toBe('loading');
    request.timeout();
    await waiting;
    expect(states.at(-1)).toMatchObject({ kind: 'failed', error: { message: 'Timed out' } });
    await loader.load();
    expect(states.at(-1)).toEqual({ kind: 'ready', document });
  });

  it('does not publish a late success after leaving the page', async () => {
    const result = Promise.withResolvers<ApiReferenceDocument>();
    const states: ReferenceState[] = [];
    const loader = new ReferenceLoader({ load: () => result.promise }, attempt, state => states.push(state));
    const loading = loader.load();
    loader.cancel();
    result.resolve(parseReference(referenceDocument(12)));
    await loading;
    expect(states.map(state => state.kind)).toEqual(['loading']);
  });
});

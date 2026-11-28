import { describe, expect, it, vi } from 'vitest';
import { referenceDocument } from '../../__tests__/fixtures/reference-document';
import { parseReference, referenceSource } from './reference-source';

describe('API reference boundary', () => {
  it('preserves root settings, inherited parameters, schemas, security overrides and extensions', () => {
    const reference = parseReference(referenceDocument(13, { path: '/expenses' }));
    expect(reference.operations.map(op => `${op.method} ${op.path}`)).toEqual(['GET /expenses', 'POST /expenses']);
    expect(reference.fields.find(f => f.name === 'servers')?.json).toContain('/api');
    expect(reference.fields.find(f => f.name === 'components')?.json).toContain('bearer');
    expect(reference.operations[0].fields.find(f => f.name === 'path.parameters')?.json).toContain('locale');
    expect(reference.operations[0].fields.find(f => f.name === 'responses')?.json).toContain('array');
    expect(reference.operations[1].fields.find(f => f.name === 'security')?.json).toBe('[]');
    expect(reference.operations[1].fields.find(f => f.name === 'x-example-extension')?.json).toContain('true');
  });

  it.each([null, [], {}, { ...referenceDocument(3), openapi: '2.0' }, { ...referenceDocument(4), paths: {} },
    { ...referenceDocument(5), info: { title: '', version: '1' } },
    { ...referenceDocument(6), paths: { '/x': { get: { responses: {} } } } },
    { ...referenceDocument(9), paths: { '/x': { $ref: '#/components/pathItems/Example' } } },
    { ...referenceDocument(10), paths: { '/x': { get: { description: 5, responses: { '200': {} } } } } },
  ])('rejects an unusable reference %j', value => {
    expect(() => parseReference(value)).toThrow();
  });

  it('requests a fresh contract without cookies or custom headers and carries cancellation through body reading', async () => {
    const controller = new AbortController();
    const fetcher = vi.fn(async () => new Response(JSON.stringify(referenceDocument(7)), { headers: { 'content-type': 'application/json' } }));
    await referenceSource('https://example.com/api/docs', fetcher).load(controller.signal);
    expect(fetcher).toHaveBeenCalledWith('https://example.com/api/docs', {
      signal: controller.signal, credentials: 'omit', cache: 'no-store',
    });
  });

  it.each([
    ['HTTP failure', new Response('down', { status: 503 })],
    ['HTML response', new Response('<html>not docs</html>', { headers: { 'content-type': 'text/html' } })],
    ['malformed JSON', new Response('not JSON', { headers: { 'content-type': 'application/json' } })],
  ] as const)('rejects %s', async (_name, response) => {
    await expect(referenceSource('https://example.com', async () => response).load(new AbortController().signal)).rejects.toThrow();
  });

  it('preserves a network failure', async () => {
    const failure = new TypeError('Disconnected');
    await expect(referenceSource('https://example.com', async () => { throw failure; }).load(new AbortController().signal)).rejects.toBe(failure);
  });
});

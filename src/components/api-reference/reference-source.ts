/** The reference is supplied by the app; no contract snapshot belongs in the site build. */
export interface ReferenceField {
  readonly name: string;
  readonly json: string;
}

export interface ReferenceOperation {
  readonly method: string;
  readonly path: string;
  readonly summary: string;
  readonly description: string;
  readonly fields: readonly ReferenceField[];
}

export interface ApiReferenceDocument {
  readonly title: string;
  readonly version: string;
  readonly description: string;
  readonly fields: readonly ReferenceField[];
  readonly operations: readonly ReferenceOperation[];
}

const METHODS = new Set(['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace']);
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const string = (value: unknown): string => typeof value === 'string' ? value : '';

function fields(value: Record<string, unknown>, exclude: readonly string[]): readonly ReferenceField[] {
  return Object.freeze(Object.entries(value).filter(([name]) => !exclude.includes(name)).map(([name, value]) => {
    const json = JSON.stringify(value, null, 2);
    if (json === undefined) throw new Error('Invalid JSON contract field');
    return Object.freeze({ name, json });
  }));
}

/** Validate what the viewer uses; preserve unrecognised contract fields as inert JSON, never discard them. */
export function parseReference(value: unknown): ApiReferenceDocument {
  if (!record(value) || !/^3\.(0|1)\.\d+$/.test(string(value.openapi)) || !record(value.info) ||
      !string(value.info.title).trim() || !string(value.info.version).trim() || !record(value.paths) ||
      (value.info.description !== undefined && typeof value.info.description !== 'string')) {
    throw new Error('Invalid OpenAPI document');
  }
  const operations: ReferenceOperation[] = [];
  for (const [path, item] of Object.entries(value.paths)) {
    if (!path.startsWith('/') || !record(item)) throw new Error('Invalid OpenAPI path');
    if (!Object.keys(item).some(method => METHODS.has(method))) throw new Error('Unsupported OpenAPI path item');
    const inherited = fields(item, [...METHODS]).map(field => Object.freeze({ ...field, name: `path.${field.name}` }));
    for (const [method, operation] of Object.entries(item)) {
      if (!METHODS.has(method)) continue;
      if (!record(operation) || !record(operation.responses) || !Object.keys(operation.responses).length) {
        throw new Error('Invalid OpenAPI operation');
      }
      for (const field of ['summary', 'description']) {
        if (operation[field] !== undefined && typeof operation[field] !== 'string') throw new Error('Invalid OpenAPI operation text');
      }
      operations.push(Object.freeze({
        method: method.toUpperCase(), path, summary: string(operation.summary), description: string(operation.description),
        fields: Object.freeze([...inherited, ...fields(operation, ['summary', 'description'])]),
      }));
    }
  }
  if (!operations.length) throw new Error('Empty OpenAPI reference');
  return Object.freeze({
    title: string(value.info.title), version: string(value.info.version), description: string(value.info.description),
    fields: fields(value, ['paths']), operations: Object.freeze(operations),
  });
}

export interface ReferenceSource {
  load(signal: AbortSignal): Promise<ApiReferenceDocument>;
}

/** Browser fetch is injected at the entry point. Cookies and cached snapshots are deliberately excluded. */
export function referenceSource(
  url: string,
  request: (url: string, init: RequestInit) => Promise<Response>,
): ReferenceSource {
  return {
    async load(signal) {
      const response = await request(url, { signal, credentials: 'omit', cache: 'no-store' });
      if (!response.ok) throw new Error(`API reference HTTP ${response.status}`);
      if (!/^application\/(?:json|[^;]+\+json)(?:;|$)/i.test(response.headers.get('content-type') ?? '')) {
        throw new Error('API reference response is not JSON');
      }
      return parseReference(await response.json());
    },
  };
}

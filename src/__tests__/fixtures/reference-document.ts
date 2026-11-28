/** Seeded, fictional upstream data shared by source and browser tests; never a production snapshot. */
export function referenceDocument(seed: number, options: { title?: string; description?: string; path?: string } = {}) {
  return {
    openapi: '3.1.0',
    info: { title: options.title ?? `Reference ${seed}`, version: `1.${seed}.0`, description: options.description ?? `Documentation ${seed}` },
    servers: [{ url: '/api' }],
    security: [{ ExampleToken: [] }],
    components: { securitySchemes: { ExampleToken: { type: 'http', scheme: 'bearer' } } },
    paths: {
      [options.path ?? `/examples-${seed}`]: {
        parameters: [{ name: 'locale', in: 'query', schema: { type: 'string' } }],
        get: { summary: 'List examples', description: `Read example ${seed}`, operationId: `list${seed}`,
          responses: { '200': { description: 'Examples', content: { 'application/json': { schema: { type: 'array', items: { type: 'string' } } } } } } },
        post: { summary: 'Create example', description: `Write example ${seed}`, operationId: `create${seed}`,
          security: [], requestBody: { content: { 'application/json': { schema: { type: 'string' } } } },
          responses: { '201': { description: 'Created' } }, 'x-example-extension': { preserved: true } },
      },
    },
  };
}

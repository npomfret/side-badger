import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Committed snapshots of the app's legal policies, written by scripts/sync-policies.mjs.
// The build reads these files only; it never touches the network (D10).
const policies = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/policies' }),
  schema: z.object({
    policyId: z.enum(['privacy-policy', 'terms-of-service', 'cookie-policy']),
    sourceUrl: z.string().url(),
    versionHash: z.string().min(1),
    publishedAt: z.coerce.date(),
    fetchedAt: z.coerce.date(),
  }),
});

export const collections = { policies };

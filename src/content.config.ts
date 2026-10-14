import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { existsSync } from 'node:fs';
import { contentSchemas } from './content/schemas';

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

// Long-form localized copy (D11): one YAML file per page per locale. Entry ids are
// `<slug>/<locale>`, e.g. `split-expenses/fr`. The schemas live in ./content/schemas so the
// Vitest content tests validate exactly what the build does.
// A directory that has no entries yet is skipped quietly instead of warning on every build.
const yaml = (dir: string) =>
  existsSync(`./src/content/${dir}`)
    ? glob({ pattern: '*/*.yaml', base: `./src/content/${dir}` })
    : glob({ pattern: 'no-entries-yet/*.yaml', base: './src/content' });

const featurePages = defineCollection({ loader: yaml('features'), schema: contentSchemas.featurePages });
const useCasePages = defineCollection({ loader: yaml('use-cases'), schema: contentSchemas.useCasePages });
const sitePages = defineCollection({ loader: yaml('pages'), schema: contentSchemas.sitePages });
const comparePages = defineCollection({ loader: yaml('compare'), schema: contentSchemas.comparePages });
const guides = defineCollection({ loader: yaml('guides'), schema: contentSchemas.guides });

export const collections = { policies, featurePages, useCasePages, sitePages, comparePages, guides };

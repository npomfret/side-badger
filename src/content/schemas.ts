/**
 * Zod schemas for the long-form content collections (restructure 3.3, D11, D12).
 *
 * Imported by `src/content.config.ts` (Astro validates the YAML at build) and by the Vitest
 * content tests, so both check exactly the same shapes. Import only `astro/zod` and pure
 * modules here: `astro:content` does not exist under Vitest.
 *
 * Every schema is strict, so a stray or misspelled field fails instead of being dropped, and
 * every entry in every locale has exactly the same keys (structural parity, checked in tests).
 */
import { z } from 'astro/zod';
import { exampleProblems, type ExampleData } from '../lib/settle';

// ---------------------------------------------------------------------------
// Rich text: inline Markdown only
// ---------------------------------------------------------------------------

const INLINE_LINK = /\[([^\]]*)\]\(([^)]*)\)/g;
export const PAGE_LINK_PREFIX = 'page:';
/** App links are written with the production origin and fixed by the launch counter later. */
const APP_LINK = /^https:\/\/app\.sidebadger\.me(\/[^\s)]*)?$/;
const PAGE_ID = /^[a-z0-9][a-z0-9-]*(\/[a-z0-9][a-z0-9-]*)*$/;

/** Inline Markdown link targets in `text`, in order. */
export function richTextLinks(text: string): { label: string; target: string }[] {
  return [...text.matchAll(INLINE_LINK)].map(match => ({ label: match[1], target: match[2] }));
}

/** Page ids linked with `[text](page:<pageId>)`. */
export function richTextPageIds(text: string): string[] {
  return richTextLinks(text)
    .filter(link => link.target.startsWith(PAGE_LINK_PREFIX))
    .map(link => link.target.slice(PAGE_LINK_PREFIX.length));
}

/** What is wrong with a rich-text value, or undefined. Exported so tests can show the reason. */
export function richTextProblem(text: string): string | undefined {
  if (text.trim() === '') return 'is empty';
  for (const { target } of richTextLinks(text)) {
    if (target.startsWith(PAGE_LINK_PREFIX)) {
      if (!PAGE_ID.test(target.slice(PAGE_LINK_PREFIX.length))) return `has a malformed page link "${target}"`;
    } else if (!APP_LINK.test(target)) {
      return `links to "${target}"; only page:<pageId> and https://app.sidebadger.me/… are allowed`;
    }
  }
  const withoutLinks = text.replace(INLINE_LINK, '$1');
  if (/!\[/.test(withoutLinks) || /!\[/.test(text)) return 'contains an image';
  if (/\]\(/.test(withoutLinks)) return 'has a malformed link';
  if (/<\/?[A-Za-z!]/.test(text)) return 'contains HTML';
  if (/https?:\/\//.test(withoutLinks)) return 'contains a bare URL; write it as a link';
  if (/^\s{0,3}(#{1,6}\s|[-*+]\s|\d+[.)]\s|>|```|~~~|\|)/m.test(text)) {
    return 'contains block Markdown (heading, list, quote, code or table)';
  }
  if (/\n\s*\n/.test(text.trim())) return 'contains more than one paragraph';
  return undefined;
}

export const richText = z.string().superRefine((value, ctx) => {
  const problem = richTextProblem(value);
  if (problem) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Rich text ${problem}` });
});

const text = z.string().min(1);

// ---------------------------------------------------------------------------
// Fields shared by every entry
// ---------------------------------------------------------------------------

const isoDate = z.preprocess(
  value => (value instanceof Date ? value.toISOString().slice(0, 10) : value),
  z.string().date()
);

/** Review status of the entry (D31). `legacy` is only for key-based pages, in the lock files. */
export const review = z
  .object({
    status: z.enum(['machine', 'checked', 'reviewed']),
    checker: z.string().min(1).optional(),
    reviewer: z.string().min(1).optional(),
    date: isoDate.optional(),
  })
  .strict()
  .refine(r => r.status !== 'reviewed' || (r.reviewer && r.date), 'reviewed needs reviewer and date')
  .refine(r => r.status !== 'checked' || (r.checker && r.date), 'checked needs checker and date');

const cta = z.object({ heading: text, body: richText, button: text }).strict();

const base = z.object({
  /** First 8 hex digits of the SHA-256 of the English entry (D14). Required outside English. */
  translatedFrom: z
    .string()
    .regex(/^[0-9a-f]{8}$/)
    .optional(),
  review,
  /** Claim ids the entry uses, identical in every locale (site plan content model) */
  claims: z.array(z.string().min(1)),
  /**
   * Dotted paths (`example.people.0.name`) whose value may equal the English one in this
   * locale, such as a proper name. Anything else identical to English fails the content test.
   */
  identicalApproved: z.array(z.string().min(1)).optional(),
  meta: z.object({ title: text, description: text }).strict(),
  h1: text,
  lead: richText,
  cta,
});

const entry = <T extends z.ZodRawShape>(shape: T) => base.extend(shape).strict();

const headedBody = z.object({ heading: text, body: richText }).strict();
const faqItems = (min: number, max: number) =>
  z.array(z.object({ q: text, a: richText }).strict()).min(min).max(max);
const faq = (min: number, max: number) => z.object({ heading: text, items: faqItems(min, max) }).strict();

// ---------------------------------------------------------------------------
// Worked example (3.4)
// ---------------------------------------------------------------------------

const personId = z.string().regex(/^[a-z][a-z0-9-]*$/);

export const workedExample = z
  .object({
    /** Optional heading above the example */
    heading: text.optional(),
    /** ISO 4217 code */
    currency: z.string().regex(/^[A-Z]{3}$/),
    people: z.array(z.object({ id: personId, name: text }).strict()).min(2),
    expenses: z
      .array(
        z
          .object({
            label: text,
            payer: personId,
            amount: z.number().positive(),
            split: z
              .object({
                method: z.enum(['equal', 'exact', 'percent']),
                shares: z.record(personId, z.number().positive()).optional(),
              })
              .strict(),
          })
          .strict()
      )
      .min(1),
  })
  .strict()
  .superRefine((example, ctx) => {
    const { heading: _heading, ...data } = example;
    for (const problem of exampleProblems(data as ExampleData)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: problem });
    }
  });

// ---------------------------------------------------------------------------
// Collections
// ---------------------------------------------------------------------------

const step = z
  .object({ title: text, body: richText, shot: text.optional(), shotAlt: text.optional() })
  .strict()
  .refine(s => !s.shot || s.shotAlt, 'a step with a shot needs shotAlt');

/** `featurePages`: `src/content/features/<slug>/<locale>.yaml` */
export const featurePage = entry({
  problem: headedBody,
  workflow: z.object({ heading: text, steps: z.array(step).min(2) }).strict(),
  options: z
    .object({ heading: text, items: z.array(z.object({ title: text, body: richText }).strict()) })
    .strict(),
  // Limits are always visible, never hidden in jokes
  limits: z.object({ heading: text, items: z.array(richText).min(1) }).strict(),
  faq: faq(3, 6),
  useCasesHeading: text,
});

/** `useCasePages`: `src/content/use-cases/<slug>/<locale>.yaml` */
export const useCasePage = entry({
  scenario: headedBody,
  example: workedExample,
  featuresHeading: text,
  faq: faq(1, 6).optional(),
});

const hubPage = entry({ intro: richText, cardsHeading: text });

const howItWorksPage = entry({
  // Create group, invite, add and split, settle
  steps: z.array(step.refine(s => s.shot && s.shotAlt, 'every step needs a shot and shotAlt')).min(4),
  requirements: z.object({ heading: text, items: z.array(richText).min(1) }).strict(),
});

/** `sitePages`: `src/content/pages/<pageId>/<locale>.yaml` (how it works, the hubs) */
export const sitePage = z.union([hubPage, howItWorksPage]);

const sections = z.array(headedBody).min(1);

/** `comparePages` (release 2): `src/content/compare/<slug>/<locale>.yaml` */
export const comparePage = entry({ sections, faq: faq(1, 6).optional() });

/** `guides` (step 8): `src/content/guides/<slug>/<locale>.yaml` */
export const guide = entry({ sections, faq: faq(1, 6).optional() });

export const contentSchemas = {
  featurePages: featurePage,
  useCasePages: useCasePage,
  sitePages: sitePage,
  comparePages: comparePage,
  guides: guide,
} as const;

export type ContentCollection = keyof typeof contentSchemas;

/** Directory under `src/content/` for each collection */
export const contentDirs: Record<ContentCollection, string> = {
  featurePages: 'features',
  useCasePages: 'use-cases',
  sitePages: 'pages',
  comparePages: 'compare',
  guides: 'guides',
};

export type FeaturePageData = z.infer<typeof featurePage>;
export type UseCasePageData = z.infer<typeof useCasePage>;
export type SitePageData = z.infer<typeof sitePage>;
export type WorkedExampleData = z.infer<typeof workedExample>;

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
import { Lexer, type Token } from 'marked';
import { exampleProblems, type ExampleData } from '../lib/settle';

// ---------------------------------------------------------------------------
// Rich text: inline Markdown only
// ---------------------------------------------------------------------------

export const PAGE_LINK_PREFIX = 'page:';
const PAGE_ID = /^[a-z0-9][a-z0-9-]*(\/[a-z0-9][a-z0-9-]*)*$/;
/** Inline tokens rich text may contain; everything else (HTML, images, code, breaks) fails. */
const ALLOWED_TOKENS = new Set(['text', 'strong', 'em', 'link', 'escape']);
/** The options RichText.astro renders with, so validation sees exactly what rendering sees. */
export const RICH_TEXT_MARKED_OPTIONS = { gfm: false } as const;

/** Inline tokens of `text`, flattened depth first. */
function inlineTokens(text: string): Token[] {
  const walk = (tokens: Token[]): Token[] =>
    tokens.flatMap(token => [token, ...('tokens' in token && token.tokens ? walk(token.tokens) : [])]);
  return walk(Lexer.lexInline(text, RICH_TEXT_MARKED_OPTIONS));
}

/** Inline Markdown link targets in `text`, in order, as marked parses them. */
export function richTextLinks(text: string): { label: string; target: string }[] {
  return inlineTokens(text)
    .filter((token): token is Token & { type: 'link'; href: string; text: string } => token.type === 'link')
    .map(token => ({ label: token.text, target: token.href }));
}

/** Page ids linked with `[text](page:<pageId>)`. */
export function richTextPageIds(text: string): string[] {
  return richTextLinks(text)
    .filter(link => link.target.startsWith(PAGE_LINK_PREFIX))
    .map(link => link.target.slice(PAGE_LINK_PREFIX.length));
}

/**
 * What is wrong with a rich-text value, or undefined. Exported so tests can show the reason.
 *
 * The only link form is `[text](page:<pageId>)`. Links to the app are not rich text: every app
 * link goes through the launch counter with a page and a position (D28), so pages use the
 * `LaunchAppCta` component, which `cta.button` feeds.
 */
export function richTextProblem(text: string): string | undefined {
  if (text.trim() === '') return 'is empty';
  if (/<[A-Za-z!?/]/.test(text)) return 'contains HTML';
  if (/^\s{0,3}(#{1,6}\s|[-*+]\s|\d+[.)]\s|>|```|~~~|\|)/m.test(text)) {
    return 'contains block Markdown (heading, list, quote, code or table)';
  }
  if (/\n\s*\n/.test(text.trim())) return 'contains more than one paragraph';
  for (const token of inlineTokens(text)) {
    if (!ALLOWED_TOKENS.has(token.type)) {
      const what: Record<string, string> = { html: 'HTML', image: 'an image', codespan: 'code', br: 'a line break' };
      return `contains ${what[token.type] ?? `a "${token.type}"`}; only bold, italic and page links are allowed`;
    }
    if (token.type === 'link') {
      const { href, title } = token as Token & { href: string; title?: string | null };
      if (title) return `has a link title in "${token.raw}"`;
      if (!href.startsWith(PAGE_LINK_PREFIX)) {
        return `links to "${href}"; only [text](page:<pageId>) is allowed (app links use LaunchAppCta)`;
      }
      if (!PAGE_ID.test(href.slice(PAGE_LINK_PREFIX.length))) return `has a malformed page link "${href}"`;
    }
  }
  const linkless = inlineTokens(text)
    .filter(token => token.type === 'text' || token.type === 'escape')
    .map(token => token.raw)
    .join('');
  if (/\]\(/.test(linkless)) return 'has a malformed link';
  if (/\b(https?:\/\/|www\.)/i.test(linkless)) return 'contains a bare URL';
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

/**
 * Where a worked example sits among `sections[]`: the number of sections rendered before it.
 * Structural, so identical in every locale (content.test.ts). Absent means the layout default.
 */
const exampleAfter = z.number().int().min(0).optional();
/** `exampleAfter` may not exceed the number of sections. */
const exampleAfterFits = (e: { exampleAfter?: number; sections?: readonly unknown[] }) =>
  e.exampleAfter === undefined || e.exampleAfter <= (e.sections?.length ?? 0);
const EXAMPLE_AFTER_MESSAGE = 'exampleAfter cannot exceed the number of sections';

const entry = <T extends z.ZodRawShape>(shape: T) => base.extend(shape).strict();

const headedBody = z.object({ heading: text, body: richText }).strict();
/** Three to six questions on every page that has an FAQ (site plan "Rules for every brief") */
const faq = z
  .object({ heading: text, items: z.array(z.object({ q: text, a: richText }).strict()).min(3).max(6) })
  .strict();
/**
 * A further H2 section in a brief's outline: a paragraph, a list, or both (for example the
 * features index's "What Side Badger doesn't do", or how it works' "39 languages").
 */
const section = z
  .object({ heading: text, body: richText.optional(), items: z.array(richText).min(1).optional() })
  .strict()
  .refine(s => s.body !== undefined || s.items !== undefined, 'a section needs a body or items');
const sections = z.array(section).min(1);

// ---------------------------------------------------------------------------
// Worked example (3.4)
// ---------------------------------------------------------------------------

const personId = z.string().regex(/^[a-z][a-z0-9-]*$/);
const currencyCode = z.string().regex(/^[A-Z]{3}$/);

/**
 * A worked example. Locales may change names, labels, amounts and (single-currency examples only)
 * the currency; people, expenses, payers, split methods and the number of payments must match
 * English (checked in content.test.ts). An expense in another currency than `currency` needs
 * `conversion.rates`, and the page then shows both the separate and the converted settlement.
 */
export const workedExample = z
  .object({
    /** Optional heading above the example */
    heading: text.optional(),
    /** ISO 4217 code of the group */
    currency: currencyCode,
    people: z.array(z.object({ id: personId, name: text }).strict()).min(2),
    expenses: z
      .array(
        z
          .object({
            label: text,
            payer: personId,
            amount: z.number().positive(),
            /** ISO 4217 code when the expense was paid in another currency */
            currency: currencyCode.optional(),
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
    /** Illustrative rates: units of `currency` per one unit of each other currency used */
    conversion: z.object({ rates: z.record(currencyCode, z.number().positive()) }).strict().optional(),
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
  /** The brief's worked example (split expenses, settle up, multiple currencies) */
  example: workedExample.optional(),
  sections: sections.optional(),
  /** With an example: sections shown before it. Absent: after `options`, before the sections. */
  exampleAfter,
  faq,
  useCasesHeading: text,
}).refine(exampleAfterFits, { message: EXAMPLE_AFTER_MESSAGE, path: ['exampleAfter'] });

/** `useCasePages`: `src/content/use-cases/<slug>/<locale>.yaml` */
export const useCasePage = entry({
  scenario: headedBody,
  /** The rest of the brief's outline, such as "Set up the house" and "When someone moves out" */
  sections: sections.optional(),
  example: workedExample,
  /** Sections shown before the example. Absent: the example comes straight after the scenario. */
  exampleAfter,
  featuresHeading: text,
  faq: faq.optional(),
}).refine(exampleAfterFits, { message: EXAMPLE_AFTER_MESSAGE, path: ['exampleAfter'] });

/** A hub (features index, use-cases index); cards come from the registry's child pages */
export const hubPage = entry({ intro: richText, cardsHeading: text, sections: sections.optional(), faq: faq.optional() });

/** How it works */
export const howItWorksPage = entry({
  // Create group, invite, add and split, settle
  steps: z.array(step.refine(s => s.shot && s.shotAlt, 'every step needs a shot and shotAlt')).min(4),
  requirements: z.object({ heading: text, items: z.array(richText).min(1) }).strict(),
  example: workedExample.optional(),
  sections: sections.optional(),
  /** With an example: sections shown before it. Absent: after the requirements. */
  exampleAfter,
  faq: faq.optional(),
}).refine(exampleAfterFits, { message: EXAMPLE_AFTER_MESSAGE, path: ['exampleAfter'] });

/**
 * `sitePages`: `src/content/pages/<pageId>/<locale>.yaml` (how it works, the hubs). The page's
 * registry type picks which of the two shapes applies (content.test.ts checks it).
 */
export const sitePage = z.union([hubPage, howItWorksPage]);
export const sitePageByType = { hub: hubPage, 'how-it-works': howItWorksPage } as const;

/** `comparePages` (release 2): `src/content/compare/<slug>/<locale>.yaml` */
export const comparePage = entry({ sections, faq: faq.optional() });

/** `guides` (step 8): `src/content/guides/<slug>/<locale>.yaml` */
export const guide = entry({ sections, faq: faq.optional() });

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

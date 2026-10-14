/**
 * JSON-LD builders (restructure 2.5, D7). Nodes are typed with `schema-dts` and joined in one
 * `@graph` per page. No `HowTo`, no ratings or reviews, `FAQPage` only for a FAQ the page shows,
 * and `priceCurrency` is `GBP`.
 *
 * Pages pass their own nodes through `BaseLayout`'s `jsonLd` prop. A node whose `@id` is the
 * page's `WebPage` id is merged into the base `WebPage` node (see `buildGraph`); every other node
 * is appended as is.
 */
import type { Thing } from 'schema-dts';
import { localeConfig, t, type Locale } from '../i18n';
import { canonicalFor, absoluteUrl } from './urls';

/** A schema.org node as it sits in the `@graph`. */
export type JsonLdNode = Exclude<Thing, string>;

export const WEBSITE_ID = 'https://sidebadger.me/#website';
export const ORGANIZATION_ID = 'https://sidebadger.me/#organization';

/** The `@id` of a page's `WebPage` node: the canonical URL plus `#webpage`. */
export function webPageId(pageId: string, locale: Locale): string {
  return `${canonicalFor(pageId, locale)}#webpage`;
}

/** The `@id` of a locale's `SoftwareApplication` node, which pages use for `WebPage.about`. */
export function softwareApplicationId(locale: Locale): string {
  return `${canonicalFor('home', locale)}#app`;
}

export interface BuildGraphInput {
  pageId: string;
  locale: Locale;
  name: string;
  description: string;
  /** Page-specific nodes. See the module comment for how they merge. */
  nodes?: readonly JsonLdNode[];
  /** Absolute URL of the logo used for the Organization */
  logoUrl: string;
}

type Loose = Record<string, unknown>;

/**
 * The `@graph` for a page: `WebSite`, `Organization` and `WebPage`, plus the page's nodes.
 * A page node with the base WebPage's `@id` is shallow-merged into it (page values win, `@id`
 * is unchanged, and a page `@type` such as `CollectionPage` replaces `WebPage`). The `not-found`
 * page has no graph.
 */
export function buildGraph(input: BuildGraphInput): JsonLdNode[] {
  const { pageId, locale, name, description, nodes = [], logoUrl } = input;
  if (pageId === 'not-found') return [];

  const website: JsonLdNode = {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    name: 'Side Badger',
    url: absoluteUrl('/'),
  };
  const organization: JsonLdNode = {
    '@type': 'Organization',
    '@id': ORGANIZATION_ID,
    name: 'Side Badger',
    url: absoluteUrl('/'),
    logo: logoUrl,
  };
  const baseId = webPageId(pageId, locale);
  let webPage: Loose = {
    '@type': 'WebPage',
    '@id': baseId,
    url: canonicalFor(pageId, locale),
    name,
    description,
    inLanguage: localeConfig[locale].htmlLang,
    isPartOf: { '@id': WEBSITE_ID },
  };

  const extra: JsonLdNode[] = [];
  for (const node of nodes) {
    if ((node as Loose)['@id'] === baseId) {
      webPage = { ...webPage, ...(node as Loose), '@id': baseId };
    } else {
      extra.push(node);
    }
  }
  return [website, organization, webPage as JsonLdNode, ...extra];
}

/** `SoftwareApplication` for the homepage (D7): free, priced in GBP. */
export function softwareApplicationNode(
  locale: Locale,
  options: { featureList?: readonly string[] } = {}
): JsonLdNode {
  const node: Loose = {
    '@type': 'SoftwareApplication',
    '@id': softwareApplicationId(locale),
    name: 'Side Badger',
    url: canonicalFor('home', locale),
    description: t('meta.description', locale),
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web',
    inLanguage: localeConfig[locale].htmlLang,
    publisher: { '@id': ORGANIZATION_ID },
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'GBP' },
  };
  if (options.featureList?.length) node.featureList = [...options.featureList];
  return node as JsonLdNode;
}

export interface FaqItem {
  question: string;
  answer: string;
}

/** `FAQPage` from the questions the page shows. Use it only where the FAQ is visible. */
export function faqPageNode(items: readonly FaqItem[]): JsonLdNode {
  return {
    '@type': 'FAQPage',
    mainEntity: items.map(({ question, answer }) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    })),
  } as JsonLdNode;
}

export interface Crumb {
  name: string;
  /** Absolute URL */
  url: string;
}

/** `BreadcrumbList`; the items must match the visible breadcrumb. */
export function breadcrumbListNode(crumbs: readonly Crumb[]): JsonLdNode {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: crumb.url,
    })),
  } as JsonLdNode;
}

/** `ItemList` of a hub's child pages. */
export function itemListNode(items: readonly Crumb[]): JsonLdNode {
  return {
    '@type': 'ItemList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      url: item.url,
    })),
  } as JsonLdNode;
}

/** `Article` for a guide; the author is the organization. */
export function articleNode(options: {
  headline: string;
  datePublished: string;
  dateModified: string;
  locale: Locale;
}): JsonLdNode {
  return {
    '@type': 'Article',
    headline: options.headline,
    datePublished: options.datePublished,
    dateModified: options.dateModified,
    inLanguage: localeConfig[options.locale].htmlLang,
    author: { '@id': ORGANIZATION_ID },
  } as JsonLdNode;
}

/**
 * The script body for a graph. `<` is escaped as `<` so no value can close the script
 * element, and U+2028 and U+2029 are escaped for older parsers.
 */
export function serializeJsonLd(nodes: readonly JsonLdNode[]): string {
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': nodes })
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

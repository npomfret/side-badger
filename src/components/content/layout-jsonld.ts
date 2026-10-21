/**
 * The JSON-LD nodes the content layouts pass to BaseLayout's `jsonLd` (restructure 2.5, D7):
 * the page-specific `WebPage` fields, the `FAQPage` for the visible FAQ, a hub's `ItemList` and a
 * guide's `Article`.
 * BaseLayout adds the base nodes and the `BreadcrumbList` (feature, use-case and guide pages only:
 * hubs and how it works are one level below Home and show no breadcrumb, D22).
 */
import type { Locale } from '../../i18n';
import {
  articleNode,
  faqPageNode,
  itemListNode,
  softwareApplicationId,
  webApplicationNode,
  webPageId,
  type JsonLdNode,
} from '../../seo/jsonld';
import { plainText } from './plain-text';

interface Faq {
  items: readonly { q: string; a: string }[];
}

/** `WebPage.about` points at the same locale's app, per 2.5. `type` swaps WebPage for CollectionPage. */
export function webPageNode(pageId: string, locale: Locale, type?: 'CollectionPage'): JsonLdNode {
  return {
    ...(type ? { '@type': type } : {}),
    '@id': webPageId(pageId, locale),
    about: { '@id': softwareApplicationId(locale) },
  } as JsonLdNode;
}

/** `FAQPage` from the same items the page shows, answers as plain text. */
export function faqNode(faq: Faq | undefined): JsonLdNode[] {
  return faq ? [faqPageNode(faq.items.map(({ q, a }) => ({ question: q, answer: plainText(a) })))] : [];
}

export { articleNode, itemListNode, webApplicationNode };

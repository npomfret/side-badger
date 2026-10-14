/** Rule 11: JSON-LD parses, carries the node types the page type needs (2.5), FAQ questions and breadcrumbs match the visible page, and WebPage.url equals the canonical. */
import type { PageType } from '../../site/pages';
import { SITE_ORIGIN, canonicalLinks, squash, visibleText, type Site, type SitePage } from '../lib/site';

type Node = Record<string, any>;

/** Node types required by page type (D7). The 404 page needs none. */
const BASE = ['WebSite', 'Organization', 'WebPage'];
export const requiredTypes: Record<PageType, string[]> = {
  home: [...BASE, 'SoftwareApplication'],
  pricing: [...BASE, 'FAQPage'],
  hub: ['WebSite', 'Organization', 'CollectionPage', 'ItemList', 'BreadcrumbList'],
  feature: [...BASE, 'BreadcrumbList'],
  'use-case': [...BASE, 'BreadcrumbList'],
  'how-it-works': [...BASE, 'BreadcrumbList'],
  comparison: [...BASE, 'BreadcrumbList'],
  legal: BASE,
  article: [...BASE, 'Article', 'BreadcrumbList'],
};

function typesOf(node: Node): string[] {
  const type = node['@type'];
  return Array.isArray(type) ? type : type ? [type] : [];
}

export function parseJsonLd(page: SitePage): { nodes: Node[]; problems: string[] } {
  const nodes: Node[] = [];
  const problems: string[] = [];
  for (const el of page.$('script[type="application/ld+json"]').toArray()) {
    const source = page.$(el).text();
    let data: unknown;
    try {
      data = JSON.parse(source);
    } catch (error) {
      problems.push(`${page.urlPath}: JSON-LD block does not parse (${(error as Error).message})`);
      continue;
    }
    const roots = Array.isArray(data) ? data : [data];
    for (const root of roots as Node[]) {
      if (root && Array.isArray(root['@graph'])) nodes.push(...root['@graph']);
      else if (root) nodes.push(root);
    }
  }
  return { nodes, problems };
}

/** The names in the visible breadcrumb trail, or undefined if the page shows none */
export function visibleBreadcrumb(page: SitePage): string[] | undefined {
  const nav = page.$('nav[aria-label="Breadcrumb"], nav[aria-label="breadcrumb"], nav.breadcrumbs, nav.breadcrumb, [data-breadcrumbs]').first();
  if (nav.length === 0) return undefined;
  const items = nav.find('li');
  return items.toArray().map(li => squash(page.$(li).text()));
}

export function checkJsonLd(site: Site): string[] {
  const problems: string[] = [];
  for (const page of site.pages) {
    const at = page.urlPath;
    const { nodes, problems: parseProblems } = parseJsonLd(page);
    problems.push(...parseProblems);
    if (page.is404) continue;

    const present = new Set(nodes.flatMap(typesOf));
    for (const type of page.page ? requiredTypes[page.page.type] : []) {
      if (!present.has(type)) problems.push(`${at}: JSON-LD lacks a ${type} node (${page.page!.type} page)`);
    }

    const text = squash(visibleText(page.$));
    for (const faq of nodes.filter(node => typesOf(node).includes('FAQPage'))) {
      const questions: Node[] = Array.isArray(faq.mainEntity) ? faq.mainEntity : faq.mainEntity ? [faq.mainEntity] : [];
      if (questions.length === 0) problems.push(`${at}: FAQPage has no questions`);
      for (const question of questions) {
        const name = squash(String(question.name ?? ''));
        if (!name || !text.includes(name)) problems.push(`${at}: FAQPage question "${name}" is not in the visible text`);
      }
    }

    for (const list of nodes.filter(node => typesOf(node).includes('BreadcrumbList'))) {
      const items: Node[] = list.itemListElement ?? [];
      const names = items.map(item => squash(String(item.name ?? item.item?.name ?? '')));
      const visible = visibleBreadcrumb(page);
      if (!visible) problems.push(`${at}: BreadcrumbList has no visible breadcrumb on the page`);
      else if (JSON.stringify(visible) !== JSON.stringify(names)) {
        problems.push(`${at}: BreadcrumbList [${names.join(' > ')}] differs from the visible breadcrumb [${visible.join(' > ')}]`);
      }
    }

    const canonical = canonicalLinks(page)[0] ?? `${SITE_ORIGIN}${page.urlPath}`;
    for (const web of nodes.filter(node => typesOf(node).some(type => type === 'WebPage' || type === 'CollectionPage'))) {
      if (web.url !== canonical) problems.push(`${at}: WebPage.url "${web.url}" differs from the canonical "${canonical}"`);
      if (page.page?.type === 'legal' && page.locale === 'en' && !web.dateModified) {
        problems.push(`${at}: English legal WebPage has no dateModified`);
      }
    }
  }
  return problems;
}

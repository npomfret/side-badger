/**
 * The safe element tree a fetched policy is rendered into. The policy is untrusted text from another
 * origin, so it never becomes an HTML string: Markdown tokens map to this allowlisted tree, and the tree
 * is built into the DOM with `createElement`, `setAttribute` and `createTextNode` only (`toDom`).
 * Raw HTML in the Markdown is never parsed; block HTML shows as literal text and inline tags are dropped.
 */

export type PolicyNode = string | PolicyElement;

export interface PolicyElement {
  tag: AllowedTag;
  attrs?: Partial<Record<AllowedAttr, string>>;
  children: PolicyNode[];
}

const TAGS = [
  'p', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'strong', 'em', 'del', 'code', 'pre', 'blockquote', 'hr', 'br',
  'a', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'div', 'input',
] as const;
export type AllowedTag = (typeof TAGS)[number];

const ATTRS = [
  'href', 'rel', 'class', 'start', 'data-align', 'role', 'tabindex', 'aria-labelledby', 'id', 'scope', 'type', 'checked', 'disabled',
  'aria-label',
] as const;
export type AllowedAttr = (typeof ATTRS)[number];

const TAG_SET: ReadonlySet<string> = new Set(TAGS);
const ATTR_SET: ReadonlySet<string> = new Set(ATTRS);

export const el = (tag: AllowedTag, children: PolicyNode[] = [], attrs?: PolicyElement['attrs']): PolicyElement => ({
  tag,
  children,
  ...(attrs ? { attrs } : {}),
});

const SAFE_SCHEMES = new Set(['http:', 'https:', 'mailto:']);

/**
 * A link destination the page will use, or undefined. Only http(s), mailto and same-site relative
 * destinations pass. Control characters and whitespace are removed first, because browsers ignore them
 * inside a scheme (`java\tscript:`).
 */
export function safeHref(raw: string): string | undefined {
  // eslint-disable-next-line no-control-regex
  const href = raw.replace(/[\u0000-\u0020\u007f-\u009f\u200b-\u200f\u2028\u2029\ufeff]/g, '');
  if (!href) return undefined;
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(href);
  if (scheme) {
    if (!SAFE_SCHEMES.has(`${scheme[1].toLowerCase()}:`)) return undefined;
    try {
      new URL(href);
    } catch {
      return undefined;
    }
    return href;
  }
  // Relative: a path, query or fragment. A protocol-relative `//host` is not same-site.
  if (/^[/\\]{2}/.test(href) || href.startsWith('\\')) return undefined;
  return /^[/?#]|^[\w.~%-]/.test(href) ? href : undefined;
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0', copy: '©', reg: '®', trade: '™',
  mdash: '—', ndash: '–', hellip: '…', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”',
  bull: '•', middot: '·', euro: '€', pound: '£',
};

/** Decode the entities a policy is likely to use. Anything else stays as written. */
export function decodeEntities(text: string): string {
  return text.replace(/&(?:#(\d{1,7})|#[xX]([0-9a-fA-F]{1,6})|([a-zA-Z]+));/g, (match, dec?: string, hex?: string, name?: string) => {
    if (name) return NAMED_ENTITIES[name] ?? match;
    const code = dec ? Number(dec) : parseInt(hex!, 16);
    return code > 0x1f && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : match;
  });
}

/** All text in the nodes, for emptiness checks */
export function textOf(nodes: readonly PolicyNode[]): string {
  return nodes.map(node => (typeof node === 'string' ? node : textOf(node.children))).join('');
}

/** Minimal DOM surface `toDom` needs, so the builder is testable without a browser. */
export interface DomFactory<N> {
  element(tag: string): N;
  text(value: string): N;
  setAttribute(node: N, name: string, value: string): void;
  append(parent: N, child: N): void;
}

/**
 * Build real DOM nodes from the tree. Defence in depth: a tag or attribute outside the allowlist (which
 * the typed tree cannot produce, but a cast could) is skipped, and `href` is re-checked.
 */
export function toDom<N>(nodes: readonly PolicyNode[], dom: DomFactory<N>, into: N): N {
  for (const node of nodes) {
    if (typeof node === 'string') {
      dom.append(into, dom.text(node));
      continue;
    }
    if (!TAG_SET.has(node.tag)) continue;
    const created = dom.element(node.tag);
    for (const [name, value] of Object.entries(node.attrs ?? {})) {
      if (!ATTR_SET.has(name) || value === undefined) continue;
      if (name === 'href') {
        const safe = safeHref(value);
        if (!safe) continue;
        dom.setAttribute(created, 'href', safe);
        continue;
      }
      dom.setAttribute(created, name, value);
    }
    toDom(node.children, dom, created);
    dom.append(into, created);
  }
  return into;
}

export const browserDom: DomFactory<Node> = {
  element: tag => document.createElement(tag),
  text: value => document.createTextNode(value),
  setAttribute: (node, name, value) => (node as Element).setAttribute(name, value),
  append: (parent, child) => parent.appendChild(child),
};

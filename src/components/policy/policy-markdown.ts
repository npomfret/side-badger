/**
 * Policy Markdown to the safe tree (`policy-tree.ts`). `marked` only tokenizes; it never produces HTML here.
 * This module is fetched after the page loads (it carries the Markdown parser), never with the page script.
 */
import { Lexer, type Token, type Tokens } from 'marked';
import { decodeEntities, el, safeHref, textOf, type PolicyElement, type PolicyNode } from './policy-tree';

export interface RenderOptions {
  /** Prefix for the generated heading ids (`<prefix>-1`), unique per page */
  idPrefix: string;
  /** Id of the page's h1, which labels a table that follows no heading */
  titleId: string;
}

/** Large enough for every real policy, small enough that a runaway response is refused */
export const MAX_POLICY_CHARS = 1_000_000;

/**
 * Render the policy body. The page keeps a single h1, so headings are shifted until the shallowest one
 * is an h2 (`#` and `##` both become h2, `###` h3, and so on, capped at h6).
 * Returns the nodes, or undefined when the Markdown has nothing to show.
 */
export function renderPolicyMarkdown(markdown: string, options: RenderOptions): PolicyNode[] | undefined {
  const tokens = new Lexer().lex(markdown);
  const depths = tokens.filter((t): t is Tokens.Heading => t.type === 'heading').map(t => t.depth);
  const shift = depths.length ? 2 - Math.min(...depths) : 0;
  let headings = 0;
  let labelledBy = options.titleId;

  const inline = (items: Token[] | undefined): PolicyNode[] => (items ?? []).flatMap(inlineToken);

  function inlineToken(token: Token): PolicyNode[] {
    switch (token.type) {
      case 'text':
      case 'escape': {
        const t = token as Tokens.Text;
        return t.tokens?.length ? inline(t.tokens) : [decodeEntities(t.text)];
      }
      case 'strong':
        return [el('strong', inline((token as Tokens.Strong).tokens))];
      case 'em':
        return [el('em', inline((token as Tokens.Em).tokens))];
      case 'del':
        return [el('del', inline((token as Tokens.Del).tokens))];
      case 'codespan':
        return [el('code', [(token as Tokens.Codespan).text])];
      case 'br':
        return [el('br')];
      case 'link': {
        const link = token as Tokens.Link;
        const children = inline(link.tokens);
        const href = safeHref(link.href);
        if (!href) return children;
        const external = /^(?:https?:)?\/\//i.test(href);
        return [el('a', children, { href, ...(external ? { rel: 'noopener noreferrer' } : {}) })];
      }
      case 'image':
        // No third-party image loads from a policy: show the alternative text.
        return [decodeEntities((token as Tokens.Image).text)];
      case 'html':
        // Raw HTML is never parsed. Inline tags are dropped; their text content stays as text tokens.
        return [];
      default: {
        const t = token as { text?: string; tokens?: Token[] };
        return t.tokens ? inline(t.tokens) : typeof t.text === 'string' ? [decodeEntities(t.text)] : [];
      }
    }
  }

  function listItem(item: Tokens.ListItem): PolicyElement {
    const children = item.tokens.flatMap(child =>
      // A tight item's text is inline; a loose one holds paragraphs.
      child.type === 'text' ? inline((child as Tokens.Text).tokens ?? [child]) : block(child)
    );
    if (item.task) {
      children.unshift(el('input', [], { type: 'checkbox', disabled: '', ...(item.checked ? { checked: '' } : {}) }), ' ');
    }
    return el('li', children);
  }

  function table(token: Tokens.Table): PolicyElement {
    const cell = (c: Tokens.TableCell, tag: 'th' | 'td'): PolicyElement =>
      el(tag, inline(c.tokens), {
        ...(c.align ? { 'data-align': c.align } : {}),
        ...(tag === 'th' ? { scope: 'col' } : {}),
      });
    const grid = el('table', [
      el('thead', [el('tr', token.header.map(c => cell(c, 'th')))]),
      el('tbody', token.rows.map(row => el('tr', row.map(c => cell(c, 'td'))))),
    ]);
    // A scrollable region must be reachable by keyboard and have a name: the nearest preceding heading.
    return el('div', [grid], { class: 'policy-table-scroll', role: 'region', 'aria-labelledby': labelledBy, tabindex: '0' });
  }

  function block(token: Token): PolicyNode[] {
    switch (token.type) {
      case 'space':
        return [];
      case 'heading': {
        const h = token as Tokens.Heading;
        const id = `${options.idPrefix}-${++headings}`;
        labelledBy = id;
        const level = Math.min(6, Math.max(2, h.depth + shift));
        return [el(`h${level}` as 'h2', inline(h.tokens), { id })];
      }
      case 'paragraph':
        return [el('p', inline((token as Tokens.Paragraph).tokens))];
      case 'text':
        return [el('p', inline((token as Tokens.Text).tokens ?? [token]))];
      case 'hr':
        return [el('hr')];
      case 'blockquote':
        return [el('blockquote', (token as Tokens.Blockquote).tokens.flatMap(block))];
      case 'code':
        return [el('pre', [el('code', [(token as Tokens.Code).text])])];
      case 'list': {
        const list = token as Tokens.List;
        const start = list.ordered && typeof list.start === 'number' && list.start !== 1 ? { start: String(list.start) } : undefined;
        return [el(list.ordered ? 'ol' : 'ul', list.items.map(listItem), start)];
      }
      case 'table':
        return [table(token as Tokens.Table)];
      case 'html': {
        const text = decodeEntities((token as Tokens.HTML).text).trim();
        return text ? [el('p', [text])] : [];
      }
      default:
        return [];
    }
  }

  const nodes = tokens.flatMap(block);
  return textOf(nodes).trim() ? nodes : undefined;
}

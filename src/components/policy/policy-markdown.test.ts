import { describe, expect, it } from 'vitest';
import { renderPolicyMarkdown } from './policy-markdown';
import { decodeEntities, safeHref, toDom, type DomFactory, type PolicyNode } from './policy-tree';

interface FakeNode {
  tag?: string;
  text?: string;
  attrs: Record<string, string>;
  children: FakeNode[];
}

/** A DOM stand-in that records what would be created, so the tests can inspect elements and attributes. */
const fake: DomFactory<FakeNode> = {
  element: tag => ({ tag, attrs: {}, children: [] }),
  text: value => ({ text: value, attrs: {}, children: [] }),
  setAttribute: (node, name, value) => void (node.attrs[name] = value),
  append: (parent, child) => void parent.children.push(child),
};

const OPTIONS = { idPrefix: 'p', titleId: 'title' };

function build(markdown: string): FakeNode {
  const nodes = renderPolicyMarkdown(markdown, OPTIONS);
  expect(nodes).toBeDefined();
  return toDom(nodes as PolicyNode[], fake, { tag: 'root', attrs: {}, children: [] });
}

function walk(node: FakeNode, visit: (node: FakeNode) => void): void {
  visit(node);
  node.children.forEach(child => walk(child, visit));
}

const all = (root: FakeNode): FakeNode[] => {
  const found: FakeNode[] = [];
  walk(root, node => found.push(node));
  return found;
};
const tags = (root: FakeNode) => all(root).flatMap(node => (node.tag ? [node.tag] : []));
const textOf = (root: FakeNode) => all(root).map(node => node.text ?? '').join('');

describe('renderPolicyMarkdown', () => {
  it('renders headings, paragraphs, emphasis, lists and rules', () => {
    const root = build('## Summary\n\nSome **bold** and *soft* text.\n\n- one\n- two\n\n1. first\n2. second\n\n---\n');
    expect(tags(root)).toEqual(['root', 'h2', 'p', 'strong', 'em', 'ul', 'li', 'li', 'ol', 'li', 'li', 'hr']);
    expect(textOf(root)).toContain('Some bold and soft text.');
  });

  it('keeps the page to one h1 by shifting the shallowest heading to h2', () => {
    expect(tags(build('# A\n\n## B\n\n### C')).filter(tag => /^h\d$/.test(tag))).toEqual(['h2', 'h3', 'h4']);
    expect(tags(build('## A\n\n### B')).filter(tag => /^h\d$/.test(tag))).toEqual(['h2', 'h3']);
    expect(tags(build('###### deep\n\n# top')).filter(tag => /^h\d$/.test(tag))).toEqual(['h6', 'h2']);
    expect(tags(build('# A\n\n## B')).includes('h1')).toBe(false);
  });

  it('gives headings unique ids and labels each table by the nearest heading before it', () => {
    const root = build('## One\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\n## Two\n\n| c |\n|---|\n| 3 |\n');
    const regions = all(root).filter(node => node.attrs.role === 'region');
    expect(regions.map(region => region.attrs['aria-labelledby'])).toEqual(['p-1', 'p-2']);
    for (const region of regions) {
      expect(region.attrs.tabindex).toBe('0');
      expect(region.attrs.class).toBe('policy-table-scroll');
      expect(region.children[0].tag).toBe('table');
    }
    expect(all(root).filter(node => node.tag === 'h2').map(node => node.attrs.id)).toEqual(['p-1', 'p-2']);
  });

  it('labels a table that follows no heading by the page title', () => {
    const region = all(build('| a |\n|---|\n| 1 |\n')).find(node => node.attrs.role === 'region');
    expect(region?.attrs['aria-labelledby']).toBe('title');
  });

  it('marks table header cells and keeps column alignment as data', () => {
    const root = build('| a | b |\n|:--|--:|\n| 1 | 2 |\n');
    const cells = all(root).filter(node => node.tag === 'th' || node.tag === 'td');
    expect(cells.map(cell => cell.tag)).toEqual(['th', 'th', 'td', 'td']);
    expect(cells[0].attrs.scope).toBe('col');
    expect(cells.map(cell => cell.attrs['data-align'])).toEqual(['left', 'right', 'left', 'right']);
  });

  it('decodes entities and never double-escapes ampersands or angle brackets in text', () => {
    expect(textOf(build('Fish &amp; chips &copy; 2026 and a < b'))).toBe('Fish & chips © 2026 and a < b');
  });

  it('returns undefined when nothing is left to show', () => {
    expect(renderPolicyMarkdown('   \n\n', OPTIONS)).toBeUndefined();
    expect(renderPolicyMarkdown('<!-- -->\n&nbsp;\n', OPTIONS)).toBeDefined();
  });

  describe('unsafe input', () => {
    it('never creates a script, style, iframe, image or event-handler attribute from raw HTML', () => {
      const root = build(
        [
          '<script>alert(1)</script>',
          '',
          'Hello <img src=x onerror=alert(2)> <b onclick="alert(3)">bold</b> <iframe src="https://evil.example"></iframe>',
          '',
          '<style>body{display:none}</style>',
          '',
          '<a href="javascript:alert(4)" onmouseover="alert(5)">raw anchor</a>',
          '',
          '![x](https://evil.example/pixel.png "t")',
        ].join('\n')
      );
      const forbidden = new Set(['script', 'style', 'iframe', 'img', 'object', 'embed', 'svg', 'link', 'meta', 'form']);
      for (const node of all(root)) {
        expect(forbidden.has(node.tag ?? '')).toBe(false);
        for (const name of Object.keys(node.attrs)) expect(name.startsWith('on')).toBe(false);
        expect(node.attrs.style).toBeUndefined();
        expect(node.attrs.src).toBeUndefined();
      }
      // The block HTML is shown as inert text, not interpreted
      expect(textOf(root)).toContain('<script>alert(1)</script>');
    });

    it('drops javascript:, data: and vbscript: link destinations but keeps the link text', () => {
      const root = build('[a](javascript:alert(1)) [b](data:text/html;base64,PHNjcmlwdD4=) [c](vbscript:x)');
      expect(all(root).filter(node => node.tag === 'a')).toHaveLength(0);
      expect(textOf(root)).toBe('a b c');
    });

    it('keeps http, https, mailto and relative links, adding rel only to external ones', () => {
      const root = build('[w](https://example.com/p) [m](mailto:hi@example.com) [r](/privacy/) [f](#top) [x](http://example.com)');
      const links = all(root).filter(node => node.tag === 'a');
      expect(links.map(link => link.attrs.href)).toEqual(['https://example.com/p', 'mailto:hi@example.com', '/privacy/', '#top', 'http://example.com']);
      expect(links.map(link => link.attrs.rel)).toEqual(['noopener noreferrer', undefined, undefined, undefined, 'noopener noreferrer']);
    });

    it('treats an HTML-looking attribute payload in a link title or text as plain text', () => {
      const root = build('[x" onmouseover="alert(1)](https://example.com "t\\" onfocus=\\"alert(2)")');
      for (const node of all(root)) expect(Object.keys(node.attrs).some(name => name.startsWith('on'))).toBe(false);
    });

    it('does not let table cells or headings carry markup out of text', () => {
      const root = build('## <img src=x onerror=alert(1)>\n\n| <script>alert(1)</script> |\n|---|\n| <b onclick=alert(2)>x</b> |\n');
      expect(tags(root)).not.toContain('script');
      expect(tags(root)).not.toContain('img');
      expect(tags(root)).not.toContain('b');
    });
  });
});

describe('safeHref', () => {
  it.each([
    ['https://example.com/a?b=c#d', 'https://example.com/a?b=c#d'],
    ['HTTP://example.com', 'HTTP://example.com'],
    ['mailto:privacy@example.com', 'mailto:privacy@example.com'],
    ['/terms/', '/terms/'],
    ['../x', '../x'],
    ['page.html', 'page.html'],
    ['?q=1', '?q=1'],
    ['#section', '#section'],
  ])('accepts %s', (input, expected) => expect(safeHref(input)).toBe(expected));

  it.each([
    'javascript:alert(1)',
    ' javascript:alert(1)',
    'java\tscript:alert(1)',
    'java\nscript:alert(1)',
    '\u0001javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    'file:///etc/passwd',
    'blob:https://example.com/x',
    '//evil.example/x',
    '\\\\evil.example',
    '',
    '   ',
  ])('rejects %j', input => expect(safeHref(input)).toBeUndefined());
});

describe('decodeEntities', () => {
  it('decodes numeric, hex and the common named entities, and leaves the rest', () => {
    expect(decodeEntities('&#65;&#x42; &amp; &nbsp;&hellip; &unknown; &#0; &#x110000;')).toBe('AB &  … &unknown; &#0; &#x110000;');
  });
});

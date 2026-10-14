/** Rule 12: no placeholder or debug text in visible text or attribute values, no data-unpublished or data-pseudo, and no staging host anywhere in the build. */
import type { Site } from '../lib/site';
import { visibleTextNodes } from '../lib/site';

interface Leak {
  name: string;
  pattern: RegExp;
}

// Whole-word tokens are matched case-sensitively so "undefinedly" or "banana" stay clean
const LEAKS: Leak[] = [
  { name: '__NGINX_HOST__', pattern: /__NGINX_HOST__/ },
  { name: 'undefined', pattern: /\bundefined\b/ },
  { name: 'NaN', pattern: /\bNaN\b/ },
  { name: '[object Object]', pattern: /\[object Object\]/ },
  { name: 'TODO', pattern: /\bTODO\b/ },
  { name: 'TBD', pattern: /\bTBD\b/ },
  { name: '{{', pattern: /\{\{/ },
  { name: 'data-unpublished', pattern: /data-unpublished/ },
  { name: 'data-pseudo', pattern: /data-pseudo/ },
];

const FORBIDDEN_ATTRIBUTES = ['data-unpublished', 'data-pseudo'];
export const STAGING_HOST = 'staging.sidebadger.me';

export function checkLeaks(site: Site): string[] {
  const problems: string[] = [];
  for (const page of site.pages) {
    const { $ } = page;
    const at = page.urlPath;
    const report = (where: string, value: string) => {
      for (const leak of LEAKS) {
        if (leak.pattern.test(value)) problems.push(`${at}: ${where} contains ${leak.name}: "${value.slice(0, 80)}"`);
      }
    };

    for (const node of visibleTextNodes($)) report('text', node.text);
    report('<title>', $('head title').text());
    // noscript content is what visitors without JavaScript see; only script and style are exempt
    for (const el of $('noscript').toArray()) report('<noscript>', $(el).text());

    // Attribute values and names on every element. Script and style bodies are not read, because
    // bundled code legitimately says `undefined`.
    for (const el of $('*').toArray()) {
      const attribs = (el as any).attribs as Record<string, string>;
      for (const [name, value] of Object.entries(attribs ?? {})) {
        if (FORBIDDEN_ATTRIBUTES.includes(name)) {
          problems.push(`${at}: <${(el as any).name}> carries the ${name} attribute`);
        }
        report(`${(el as any).name}[${name}]`, value);
      }
    }
  }

  for (const file of site.files) {
    if (site.read(file)?.includes(STAGING_HOST)) problems.push(`${file}: contains ${STAGING_HOST}`);
  }
  return problems;
}

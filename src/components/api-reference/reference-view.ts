import { el, toDom, browserDom, type PolicyNode } from '../policy/policy-tree';
import type { ApiReferenceDocument, ReferenceField } from './reference-source';

/** Protocol field names and values are source data, rendered literally, including any embedded HTML. */
function fieldList(fields: readonly ReferenceField[]): PolicyNode[] {
  return fields.map(field => el('details', [
    el('summary', [field.name]),
    el('pre', [el('code', [field.json])]),
  ]));
}

export function showReference(document: ApiReferenceDocument, root: HTMLElement): void {
  root.replaceChildren();
  toDom([
    el('p', [el('strong', [document.title]), ` · ${document.version}`]),
    el('p', [document.description], { class: 'api-reference__description' }),
    ...fieldList(document.fields),
    ...document.operations.map(operation => el('details', [
      el('summary', [el('code', [`${operation.method} ${operation.path}`]), ` ${operation.summary}`]),
      el('p', [operation.description], { class: 'api-reference__description' }),
      ...fieldList(operation.fields),
    ], { class: 'api-reference__operation', 'aria-label': `${operation.method} ${operation.path} ${operation.summary}`.trim() })),
  ], browserDom, root);
}

export function filterReference(root: HTMLElement, query: string): boolean {
  const text = query.trim().toLocaleLowerCase('en');
  let matches = false;
  for (const operation of root.querySelectorAll<HTMLElement>('.api-reference__operation')) {
    operation.hidden = !(operation.textContent ?? '').toLocaleLowerCase('en').includes(text);
    matches ||= !operation.hidden;
  }
  return matches;
}

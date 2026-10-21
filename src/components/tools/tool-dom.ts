/**
 * What the calculators' page scripts share at load (release 2, R3): finding script hooks, cloning
 * the `<template>`s that rows are built from, filling `{placeholders}`, and fetching what can wait
 * until after load (`later`). Both scripts are loaded on their own page, so only what a page uses
 * is shipped with it. The "Copy link" flow is in `share-link.ts`, fetched with the engine
 * (restructure D36).
 */

/** Fill `{placeholders}` in one pass, so a value that contains braces is never expanded again */
export const fill = (template: string, params: Record<string, string | number>): string =>
  template.replace(/\{(\w+)\}/g, (_token, name: string) => String(params[name] ?? ''));

/** The element a script hook (`data-ref`) names inside `scope` */
export function ref<T extends HTMLElement = HTMLElement>(scope: ParentNode, name: string): T {
  const element = scope.querySelector<T>(`[data-ref="${name}"]`);
  if (!element) throw new Error(`Calculator: no element with data-ref="${name}"`);
  return element;
}

/** A copy of the first element in the `<template data-template="name">` inside `root` */
export function cloneTemplate(root: ParentNode, name: string): HTMLElement {
  const template = root.querySelector<HTMLTemplateElement>(`template[data-template="${name}"]`)!;
  return template.content.firstElementChild!.cloneNode(true) as HTMLElement;
}

export interface Later<T> {
  /** The module, once it has arrived */
  readonly module: T | undefined;
  /** Fetch the module, unless it is here or on its way. A failed fetch is forgotten, so the next call retries. */
  fetch(): Promise<T>;
}

/**
 * A module the page fetches after load, when it is first needed (restructure D36). Pass a function
 * that calls `import()` with a literal path, so the bundler splits the module out.
 */
export function later<T>(load: () => Promise<T>): Later<T> {
  let module: T | undefined;
  let loading: Promise<T> | undefined;
  return {
    get module() {
      return module;
    },
    fetch: () =>
      (loading ??= load().then(
        arrived => (module = arrived),
        error => {
          loading = undefined;
          throw error;
        }
      )),
  };
}

/** Put a real space between adjacent element children, so a row reads "Ana +£60.00" to text and screen readers alike. */
export function spaceOut(row: HTMLElement): HTMLElement {
  for (const child of Array.from(row.children).slice(1)) {
    if (child.previousSibling === child.previousElementSibling) child.before(document.createTextNode(' '));
  }
  return row;
}

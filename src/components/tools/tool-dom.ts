/**
 * What the calculators' page scripts share (release 2, R3): finding script hooks, cloning the
 * `<template>`s that rows are built from, filling `{placeholders}`, and the "Copy link" flow.
 * Both scripts are loaded on their own page, so only what a page uses is shipped with it.
 */
import { HASH_PREFIX } from './fragment-codec';

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

export interface ShareParts {
  /** Where "Link copied" and its failures are said */
  status: HTMLElement;
  /** The box that holds the link to copy by hand */
  linkBox: HTMLElement;
  linkInput: HTMLInputElement;
}

export interface ShareMessages {
  copied: string;
  copyFailed: string;
  linkTooLarge: string;
}

/**
 * Put the link for `payload` in the address bar and on the clipboard. A payload of `null` is a
 * calculation too big for a link. With no clipboard permission, or on an insecure page, the link
 * is shown selected, to copy by hand.
 */
export async function copyShareLink(payload: string | null, parts: ShareParts, messages: ShareMessages): Promise<void> {
  parts.linkBox.hidden = true;
  if (payload === null) {
    parts.status.textContent = messages.linkTooLarge;
    return;
  }
  // The address bar gets the same link, so a reload or a bookmark keeps the figures
  history.replaceState(null, '', `${HASH_PREFIX}${payload}`);
  const url = `${location.origin}${location.pathname}${location.search}${HASH_PREFIX}${payload}`;
  try {
    await navigator.clipboard.writeText(url);
    parts.status.textContent = messages.copied;
  } catch {
    parts.status.textContent = messages.copyFailed;
    parts.linkInput.value = url;
    parts.linkBox.hidden = false;
    parts.linkInput.focus();
    parts.linkInput.select();
  }
}

/**
 * The calculators' "Copy link" flow (release 2, R3): the link goes in the address bar and on the
 * clipboard, or is shown to copy by hand. Fetched after the page with each calculator's engine and
 * codec (`split-deferred.ts`, `rent-deferred.ts`), not at load (restructure D36).
 */
import { HASH_PREFIX } from './share-hash';

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

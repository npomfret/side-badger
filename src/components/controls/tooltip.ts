/**
 * The behaviour of Tooltip.astro (`[data-tooltip]` on its anchor). CSS opens a tooltip on keyboard
 * focus and on hover; Escape hides an open one until the pointer leaves the anchor or focus moves
 * out of it, so it can be dismissed without moving either (WCAG 1.4.13). Tooltip's own script
 * calls this; the guard wires a document once however many tooltips, or copies of the script, the
 * page has.
 */
const wired = new WeakSet<Document>();

export function dismissTooltipsOnEscape(doc: Document): void {
  if (wired.has(doc)) return;
  wired.add(doc);
  doc.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    doc.querySelectorAll('[data-tooltip]:is(:hover, :has(:focus-visible))').forEach(el => el.setAttribute('data-tooltip-dismissed', ''));
  });
  doc.addEventListener('focusout', event => {
    const control = (event.target as Element | null)?.closest?.('[data-tooltip]');
    if (control && !control.contains(event.relatedTarget as Node | null)) control.removeAttribute('data-tooltip-dismissed');
  });
  // pointerleave does not bubble: capture sees it for every element
  doc.addEventListener('pointerleave', event => {
    const el = event.target;
    if (el instanceof Element && el.matches('[data-tooltip]')) el.removeAttribute('data-tooltip-dismissed');
  }, true);
}

/**
 * Changes the text of the tooltip that labels `control` (an element in a Tooltip's slot), for a
 * script that renames the control at run time. The tooltip must keep saying what the control's
 * accessible name says.
 */
export function setTooltipText(control: Element, text: string): void {
  const tip = control.closest('[data-tooltip]')?.querySelector('[data-tooltip-text]');
  if (!tip) throw new Error('setTooltipText: the control is not inside a Tooltip');
  tip.textContent = text;
}

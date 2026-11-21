import { setTooltipText } from './tooltip';

/**
 * Names an IconButton that a script made (a row cloned from a <template>): the accessible name and
 * the tooltip always change together. `button` is the IconButton's <button>.
 */
export function setIconButtonLabel(button: HTMLElement, label: string): void {
  button.setAttribute('aria-label', label);
  setTooltipText(button, label);
}

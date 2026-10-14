/**
 * Short interface strings the content components print (restructure D13). Most are in `en.ts`.
 * The `example.*` keys below the first block are new in P24; until the coordinator adds them to
 * `en.ts` (they are listed in the P24 handover), `uiString` falls back to the English text here,
 * pseudo-localized in the pseudo-locales, so the build and the layouts work either way. Once a
 * key is in `en.ts` the table value wins, so this fallback can be deleted without a change in
 * output.
 */
import en from '../../i18n/en';
import { isPseudoLocale, t, tf, type Locale, type TranslationKey } from '../../i18n';
import { pseudoText } from '../../i18n/pseudo';
import { PENDING_STRINGS } from './pending-strings';

export type PendingKey = keyof typeof PENDING_STRINGS;
export type UiKey = TranslationKey | PendingKey;

function isPending(key: UiKey): key is PendingKey {
  return key in PENDING_STRINGS && !(key in en);
}

/** `t()` for keys that may not be in `en.ts` yet, with `{placeholder}` filling. */
export function uiString(key: UiKey, locale: Locale, params: Record<string, string | number> = {}): string {
  if (!isPending(key)) return tf(key, params, locale);
  const english = PENDING_STRINGS[key];
  const text = isPseudoLocale(locale) ? pseudoText(english, locale) : english;
  return text.replace(/\{([A-Za-z_]\w*)\}/g, (_token, name: string) => {
    if (!Object.hasOwn(params, name)) throw new Error(`uiString("${key}"): no value for {${name}}`);
    return String(params[name]);
  });
}

export { t };

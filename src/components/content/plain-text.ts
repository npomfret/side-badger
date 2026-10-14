/**
 * Rich text (inline Markdown, restructure 3.3) as plain text, for places that cannot show markup:
 * the `FAQPage` JSON-LD answers (which must match the visible answer) and tests.
 */
import { Lexer, type Token } from 'marked';
import { RICH_TEXT_MARKED_OPTIONS } from '../../content/schemas';

function flatten(tokens: Token[]): string {
  return tokens
    .map(token =>
      'tokens' in token && token.tokens ? flatten(token.tokens) : 'text' in token ? String(token.text) : token.raw
    )
    .join('');
}

/** `**bold** [a link](page:pricing)` becomes `bold a link`. */
export function plainText(text: string): string {
  return flatten(Lexer.lexInline(text, RICH_TEXT_MARKED_OPTIONS));
}

/** Machine-facing production guidance shared by the HTML comment and document head. */
import type { PageType } from '../site/pages';

const documentation = 'https://app.sidebadger.me/api/docs';

export const agentGuidance = Object.freeze({
  instructions: [
    'This page is available as Markdown. Request this URL with Accept: text/markdown, or follow the text/markdown alternate link in the document head.',
    'This is the Side Badger marketing website; the web app is https://app.sidebadger.me/.',
    'MCP endpoint: https://app.sidebadger.me/api/mcp (Streamable HTTP; OAuth account linking required).',
    'After connecting, use tools/list for current tool descriptions and input/output schemas.',
    `REST API documentation (OpenAPI 3.1): ${documentation}. Use each operation's documented authentication and permissions.`,
    'Skills: use the manage-shared-expenses workflow skill when supplied by your connected integration.',
    'No public skill download is linked here yet.',
  ].join(' '),
  documentation,
});

/** A public source contract is documentation, not an application launch. Keep the exception exact. */
export function isDocumentationSourceLink(pageType: PageType | undefined, href: string): boolean {
  return pageType === 'api-reference' && href === agentGuidance.documentation;
}

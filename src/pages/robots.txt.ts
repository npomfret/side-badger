import type { APIRoute } from 'astro';

export const GET: APIRoute = () => {
  const sitemapUrl = new URL('/sitemap-index.xml', import.meta.env.SITE);
  const robotsTxt = `# See https://www.robotstxt.org/robotstxt.html for documentation
User-agent: *

Sitemap: ${sitemapUrl}
`;

  return new Response(robotsTxt, {
    headers: { 'Content-Type': 'text/plain' }
  });
};

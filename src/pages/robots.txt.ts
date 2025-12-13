import type { APIRoute } from 'astro';

// __NGINX_HOST__ is replaced by Nginx sub_filter with the actual $host
export const GET: APIRoute = () => {
  const robotsTxt = `# See https://www.robotstxt.org/robotstxt.html for documentation
User-agent: *
Disallow: /terms
Disallow: /privacy
Disallow: /pricing
Disallow: /cookies

Sitemap: https://__NGINX_HOST__/sitemap-index.xml
`;

  return new Response(robotsTxt, {
    headers: { 'Content-Type': 'text/plain' }
  });
};

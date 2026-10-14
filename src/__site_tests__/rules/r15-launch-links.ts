/** Rule 15: every link to the app goes through /go/app/ or /go/register/ with from, cta and (outside English) lang, and carries rel="nofollow". Pseudo-locales need no lang, because launchHref omits it. */
import { getAppUrl } from '../../i18n';
import { SITE_ORIGIN, isPseudoPage, type Site } from '../lib/site';

const APP_HOSTS = new Set([new URL(getAppUrl()).host, 'app.sidebadger.me', 'staging.sidebadger.me']);
const TARGETS = new Set(['/go/app/', '/go/register/']);

export function checkLaunchLinks(site: Site): string[] {
  const problems: string[] = [];
  for (const page of site.pages) {
    const locale = page.is404 ? 'en' : page.locale;
    for (const el of page.$('a[href]').toArray()) {
      const anchor = page.$(el);
      const href = anchor.attr('href')!.trim();
      let url: URL;
      try {
        url = new URL(href, SITE_ORIGIN);
      } catch {
        continue;
      }
      const at = `${page.urlPath}: <a href="${href}">`;
      if (APP_HOSTS.has(url.host)) {
        problems.push(`${at} links straight to the app; use /go/app/ or /go/register/`);
        continue;
      }
      if (url.origin !== SITE_ORIGIN || !url.pathname.startsWith('/go/')) continue;

      if (!TARGETS.has(url.pathname)) problems.push(`${at} is not /go/app/ or /go/register/`);
      if (!url.searchParams.get('from')) problems.push(`${at} has no "from"`);
      if (!url.searchParams.get('cta')) problems.push(`${at} has no "cta"`);
      const lang = url.searchParams.get('lang');
      if (locale && locale !== 'en' && !isPseudoPage(page)) {
        if (!lang) problems.push(`${at} has no "lang" on a ${locale} page`);
        else if (lang !== locale) problems.push(`${at} has lang=${lang} on a ${locale} page`);
      }
      const rel = (anchor.attr('rel') ?? '').toLowerCase().split(/\s+/);
      if (!rel.includes('nofollow')) problems.push(`${at} lacks rel="nofollow"`);
    }
  }
  return problems;
}

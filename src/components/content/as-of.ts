/**
 * The "as of" date of a comparison page (site plan D16): `asOf` is a calendar day (YYYY-MM-DD), so
 * it is formatted in UTC and no time zone can move it. English uses the British order, like the
 * rest of its copy ("21 October 2026"); every other locale uses its own `intlCode`.
 *
 * Shared by `ComparePageLayout.astro` and the layouts spec's page object, so the page and the test
 * agree. It takes the locale code and its Intl code rather than importing the i18n module, because
 * the Playwright specs cannot load that module.
 */
export function formatAsOf(asOf: string, locale: string, intlCode: string): string {
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : intlCode, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${asOf}T00:00:00Z`));
}

import fs from 'node:fs';
import path from 'node:path';
import { expect, type Locator, type Page } from '@playwright/test';
import en from '../../src/i18n/en';
import type { PageDef } from '../../src/site/pages';
import { ELEMENT_TIMEOUT, MODAL_TIMEOUT, NAVIGATION_TIMEOUT } from './timeouts';
import {
  HTML_LANG,
  isRtl,
  LOCALE_NAMES,
  pathFor,
  text,
  type LocalizedLocale,
  type StringKey,
} from './strings';

const I18N_DIR = path.join(process.cwd(), 'src/i18n');

/** Every real locale: English plus one lock file per translated locale */
export function realLocales(): string[] {
  const translated = fs
    .readdirSync(path.join(I18N_DIR, 'locks'))
    .filter(file => file.endsWith('.json'))
    .map(file => file.replace(/\.json$/, ''));
  return ['en', ...translated].sort();
}

/** Keys the locale's lock approves as identical to English (`identicalApproved`) */
function identicalApproved(locale: LocalizedLocale): ReadonlySet<string> {
  const lock = JSON.parse(fs.readFileSync(path.join(I18N_DIR, 'locks', `${locale}.json`), 'utf-8')) as {
    identicalApproved?: string[];
  };
  return new Set(lock.identicalApproved ?? []);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** The shell labels a visitor reads on every page */
const SHELL_KEYS: readonly StringKey[] = [
  'header.signIn',
  'nav.features',
  'nav.useCases',
  'nav.howItWorks',
  'nav.pricing',
  'nav.menu',
  'footer.product',
  'footer.useCases',
  'footer.legal',
  'footer.privacy',
  'footer.terms',
  'footer.cookies',
  'support.title',
  'footer.tagline',
  'a11y.homeLink',
  'a11y.mainNavigation',
  'a11y.skipToContent',
  'a11y.changeLanguage',
];

/**
 * A page of the site in a real locale, as a visitor of that language sees it: `lang` and `dir`,
 * the shell's labels in the locale, launch links that carry the locale, and a language switcher
 * that lists and links every real locale. `navigateTo` is the only way in.
 */
export class LocalizedPage {
  private constructor(
    private readonly page: Page,
    private readonly locale: LocalizedLocale,
    private readonly def: PageDef
  ) {}

  static async navigateTo(page: Page, locale: LocalizedLocale, def: PageDef): Promise<LocalizedPage> {
    const localized = new LocalizedPage(page, locale, def);
    await page.goto(localized.url);
    await localized.verifyLoaded();
    return localized;
  }

  private get url(): string {
    return pathFor(this.locale, this.def.path === '/' ? '' : this.def.path);
  }

  private string(key: StringKey): string {
    return text(this.locale, key);
  }

  // ----- locators, built fresh on every use -----

  private get html(): Locator {
    return this.page.locator('html');
  }

  private get banner(): Locator {
    return this.page.getByRole('banner');
  }

  private get footer(): Locator {
    return this.page.getByRole('contentinfo');
  }

  private get mainNav(): Locator {
    return this.page.getByRole('navigation', { name: this.string('a11y.mainNavigation') });
  }

  private get menuButton(): Locator {
    return this.banner.getByRole('button', { name: this.string('nav.menu'), exact: true });
  }

  private get closeMenuButton(): Locator {
    return this.page.getByRole('button', { name: this.string('nav.closeMenu'), exact: true });
  }

  private get switcherButton(): Locator {
    return this.banner.getByRole('button', {
      name: new RegExp(`^${escapeRegExp(this.string('a11y.changeLanguage'))}`),
    });
  }

  private get switcherSearch(): Locator {
    return this.banner.getByRole('textbox', { name: this.string('a11y.searchLanguages') });
  }

  private get switcherOptions(): Locator {
    return this.banner.getByRole('group', { name: this.string('a11y.changeLanguage') }).getByRole('link');
  }

  // ----- the page -----

  async verifyLoaded(): Promise<void> {
    await expect(this.page, 'URL').toHaveURL(this.url, { timeout: NAVIGATION_TIMEOUT });
    await expect(this.banner, `the site header of ${this.url}`).toBeVisible({ timeout: ELEMENT_TIMEOUT });
    await expect(this.footer, 'the site footer').toBeVisible({ timeout: ELEMENT_TIMEOUT });
  }

  /** `<html lang>` is the locale's tag and `dir` follows its script */
  async expectLangAndDir(): Promise<void> {
    await expect(this.html, 'html lang').toHaveAttribute('lang', HTML_LANG[this.locale]);
    await expect(this.html, 'html dir').toHaveAttribute('dir', isRtl(this.locale) ? 'rtl' : 'ltr');
  }

  /**
   * The shell reads in the locale: every label is the locale's own string, and none of them is the
   * English one unless the locale's lock approves it as identical (a loanword such as "Menu").
   */
  async expectShellInLocale(phone: boolean): Promise<void> {
    const approved = identicalApproved(this.locale);
    const fallback = SHELL_KEYS.filter(key => this.string(key) === en[key] && !approved.has(key));
    expect(fallback, `${this.locale} shell labels that are still English`).toEqual([]);

    await expect(this.banner.getByRole('link', { name: this.string('header.signIn') }), 'the launch link').toBeVisible();
    await expect(this.banner.getByRole('link', { name: this.string('a11y.homeLink') }), 'the logo link').toBeVisible();
    await expect(this.switcherButton, 'the language switcher').toBeVisible();

    if (phone) {
      await expect(this.mainNav, 'the menu starts closed').toBeHidden();
      await this.menuButton.click();
      await expect(this.closeMenuButton, 'the menu opened').toBeVisible({ timeout: MODAL_TIMEOUT });
    }
    await expect(this.mainNav.getByRole('link'), 'header navigation').toHaveText([
      this.string('nav.features'),
      this.string('nav.useCases'),
      this.string('nav.howItWorks'),
      this.string('nav.pricing'),
    ]);
    if (phone) {
      await this.page.keyboard.press('Escape');
      await expect(this.closeMenuButton, 'Escape closes the menu').toBeHidden({ timeout: MODAL_TIMEOUT });
    }

    await expect(this.footer.getByRole('heading', { level: 2 }), 'footer headings').toHaveText([
      this.string('footer.product'),
      this.string('footer.useCases'),
      this.string('footer.legal'),
    ]);
    // Content pages are labelled by their own localized title, so the footer lists are checked by target
    const hrefs = (group: StringKey) =>
      this.footer
        .getByRole('list', { name: this.string(group), exact: true })
        .getByRole('link')
        .evaluateAll(links => links.map(a => a.getAttribute('href')));
    await expect
      .poll(() => hrefs('footer.product'), { message: 'footer product links', timeout: ELEMENT_TIMEOUT })
      .toEqual(
        ['how-it-works', 'features', 'features/split-expenses', 'features/settle-up', 'features/multiple-currencies', 'pricing', 'support', 'split-bill-calculator', 'rent-split-calculator'].map(
          route => pathFor(this.locale, route)
        )
      );
    await expect
      .poll(() => hrefs('footer.useCases'), { message: 'footer use-case links', timeout: ELEMENT_TIMEOUT })
      .toEqual(
        ['use-cases', 'use-cases/group-trips', 'use-cases/housemates', 'use-cases/events-and-celebrations', 'use-cases/couples', 'guides'].map(route =>
          pathFor(this.locale, route)
        )
      );
    await expect(
      this.footer.getByRole('list', { name: this.string('footer.legal'), exact: true }).getByRole('link'),
      'footer legal links'
    ).toHaveText([this.string('footer.privacy'), this.string('footer.terms'), this.string('footer.cookies')]);
    await expect(this.footer, 'the footer tagline').toContainText(this.string('footer.tagline'));
  }

  /** Every launch link goes through /go/ and passes this locale as `lang` */
  async expectLaunchLinksCarryLocale(): Promise<void> {
    await expect
      .poll(
        () =>
          this.page
            .locator('a[href^="/go/"]')
            .evaluateAll(anchors => anchors.map(a => a.getAttribute('href') ?? '')),
        { message: 'the page has launch links', timeout: ELEMENT_TIMEOUT }
      )
      .not.toEqual([]);
    const hrefs = await this.page
      .locator('a[href]')
      .evaluateAll(anchors => anchors.map(a => a.getAttribute('href') ?? ''));
    const launch = hrefs.filter(href => href.startsWith('/go/'));
    const wrong = launch.filter(href => {
      const url = new URL(href, 'http://x');
      return !/^\/go\/(app|register)\/$/.test(url.pathname) || url.searchParams.get('lang') !== this.locale;
    });
    const direct = hrefs.filter(href => /^https?:\/\/(app|staging)\.sidebadger\.me/.test(href));
    expect({ wrong, direct }, `launch links on ${this.url}`).toEqual({ wrong: [], direct: [] });
  }

  /**
   * The language switcher lists every real locale (and the regional aliases, which link to the
   * locale they copy), each linking to this page in that locale; this locale is the current one.
   */
  async expectSwitcherListsRealLocales(): Promise<void> {
    await expect(this.switcherButton).toHaveAttribute('aria-expanded', 'false');
    await this.switcherButton.click();
    await expect(this.switcherButton, 'the switcher opened').toHaveAttribute('aria-expanded', 'true');
    await expect(this.switcherSearch, 'the search box takes focus').toBeFocused();

    const tail = this.def.path === '/' ? '' : this.def.path;
    const expected = realLocales().map(locale => pathFor(locale as LocalizedLocale, tail)).sort();
    await expect
      .poll(
        async () => {
          const hrefs = await this.switcherOptions.evaluateAll(links => links.map(a => a.getAttribute('href') ?? ''));
          // Preview builds add the pseudo-locales; they are not real locales
          return [...new Set(hrefs.filter(href => !/^\/xx-/.test(href)))].sort();
        },
        { message: 'the switcher links this page in every real locale', timeout: ELEMENT_TIMEOUT }
      )
      .toEqual(expected);

    const current = this.switcherOptions.and(this.page.getByRole('link', { name: LOCALE_NAMES[this.locale], exact: true }));
    await expect(current, `the ${this.locale} option`).toHaveAttribute('href', this.url);
    await expect(current, `the ${this.locale} option is the current one`).toHaveAttribute('aria-current', 'true');

    await this.page.keyboard.press('Escape');
    await expect(this.switcherButton, 'Escape closes the switcher').toHaveAttribute('aria-expanded', 'false');
    await expect(this.switcherButton, 'focus returns to the switcher button').toBeFocused();
  }
}

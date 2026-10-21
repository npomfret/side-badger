import AxeBuilder from '@axe-core/playwright';
import { expect, type Locator, type Page } from '@playwright/test';
import { ELEMENT_TIMEOUT, NAVIGATION_TIMEOUT } from './timeouts';
import { isRtl, pathFor, text, type ShellLocale } from './strings';
import { formatAsOf } from '../../src/components/content/as-of';
import { moneyFormatter } from '../../src/components/content/money';
import {
  exampleLines,
  fixtureFor,
  INTL,
  LAYOUT_PAGE_IDS,
  LAYOUT_ROUTES,
  uiText,
  type Fixture,
  type LayoutKind,
} from './layoutsFixtures';

/**
 * One of the six content layouts (FeaturePageLayout, UseCasePageLayout, HubLayout,
 * HowItWorksLayout, GuidePageLayout, ComparePageLayout), shown by its preview page. The expected text is the page's fixture
 * (`src/content/**\/__preview__`), pseudoized for the pseudo-locales, so every check names what
 * the visitor should read. `navigateTo` is the only way in.
 */
export class ContentPage {
  private readonly fixture: Fixture;

  private constructor(
    private readonly page: Page,
    private readonly locale: ShellLocale,
    private readonly kind: LayoutKind
  ) {
    this.fixture = fixtureFor(kind, locale);
  }

  static async navigateTo(page: Page, locale: ShellLocale, kind: LayoutKind): Promise<ContentPage> {
    const content = new ContentPage(page, locale, kind);
    await page.goto(pathFor(locale, LAYOUT_ROUTES[kind]));
    await content.verifyLoaded();
    return content;
  }

  // ----- locators, built fresh on every use -----

  private get main(): Locator {
    return this.page.getByRole('main');
  }

  private get hero(): Locator {
    return this.main.getByRole('region', { name: this.fixture.h1, exact: true });
  }

  private get closing(): Locator {
    return this.main.getByRole('region', { name: this.fixture.cta.heading, exact: true });
  }

  private region(name: string): Locator {
    return this.main.getByRole('region', { name, exact: true });
  }

  private get breadcrumb(): Locator {
    return this.page.getByRole('navigation', { name: text(this.locale, 'a11y.breadcrumb'), exact: true });
  }

  /** The register link in the hero or the closing band; its accessible name ends with "External link". */
  private launchLink(where: 'hero' | 'footer-cta' | 'guide-end'): Locator {
    const label = text(this.locale, 'home.hero.ctaPrimary');
    return (where === 'hero' ? this.hero : this.closing).getByRole('link', {
      name: new RegExp(`^${escapeRegExp(label)}`),
    });
  }

  // ----- the page -----

  async verifyLoaded(): Promise<void> {
    await expect(this.page, 'URL').toHaveURL(pathFor(this.locale, LAYOUT_ROUTES[this.kind]), {
      timeout: NAVIGATION_TIMEOUT,
    });
    await expect(this.page.locator('html'), 'text direction').toHaveAttribute('dir', isRtl(this.locale) ? 'rtl' : 'ltr');
    await expect(this.page.getByRole('heading', { level: 1 }), `the ${this.kind} page's one h1`).toHaveText(this.fixture.h1, {
      timeout: ELEMENT_TIMEOUT,
    });
    await expect(this.page.getByRole('contentinfo'), 'the site footer').toBeVisible();
  }

  /** The h2 sections, in order, with nothing missing and nothing extra. */
  async expectSections(): Promise<void> {
    await expect(this.main.getByRole('heading', { level: 2 }), `${this.kind} page sections`).toHaveText(this.expectedSections());
  }

  private expectedSections(): string[] {
    const f = this.fixture;
    const extra = (f.sections ?? []).map(s => s.heading);
    // The example sits after `exampleAfter` sections when set, else at the layout's default place
    const split = f.exampleAfter ?? 0;
    const example = f.example ? [f.example.heading!] : [];
    const around = [...extra.slice(0, split), ...example, ...extra.slice(split)];
    const related = text(this.locale, 'related.heading');
    // The product pages list the guide that names them, between the FAQ and the related pages
    const guides = text(this.locale, 'related.guidesHeading');
    switch (this.kind) {
      case 'feature':
        return [
          f.problem!.heading,
          f.workflow!.heading,
          f.options!.heading,
          ...(f.exampleAfter === undefined ? [...example, ...extra] : around),
          f.limits!.heading,
          f.useCasesHeading!,
          f.faq!.heading,
          guides,
          related,
          f.cta.heading,
        ];
      case 'use-case':
        return [f.scenario!.heading, ...around, f.featuresHeading!, f.faq!.heading, guides, related, f.cta.heading];
      case 'hub':
        return [f.cardsHeading!, ...extra, f.faq!.heading, related, f.cta.heading];
      case 'how-it-works':
        return [
          ...f.steps!.map(s => s.title),
          f.requirements!.heading,
          ...around,
          f.faq!.heading,
          guides,
          related,
          f.cta.heading,
        ];
      case 'guide':
        return [...around, f.faq!.heading, related, f.cta.heading];
      case 'compare': {
        // The table sits after `tableAfter` sections
        const tableAfter = f.tableAfter ?? 0;
        return [...extra.slice(0, tableAfter), f.table!.heading, ...extra.slice(tableAfter), f.faq!.heading, related, f.cta.heading];
      }
    }
  }

  // ----- hero, calls to action -----

  /** Both calls to action are register links through the launch counter, with the page's id. A guide's closing one is counted as `guide-end`. */
  async expectLaunchLinks(): Promise<void> {
    const from = LAYOUT_PAGE_IDS[this.kind];
    const lang = this.locale === 'en' || this.locale.startsWith('xx-') ? '' : `&lang=${this.locale}`;
    for (const cta of ['hero', this.kind === 'guide' ? 'guide-end' : 'footer-cta'] as const) {
      const link = this.launchLink(cta);
      await expect(link, `the ${cta} call to action`).toBeVisible();
      await expect(link).toHaveAttribute('href', `/go/register/?from=${from}&cta=${cta}${lang}`);
      await expect(link).toHaveAttribute('rel', 'nofollow');
    }
  }

  // ----- breadcrumbs -----

  /** Feature and use-case pages are two levels down and show Home, the hub and the page; a guide shows Home, Guides and the page. */
  async expectBreadcrumb(): Promise<void> {
    if (this.kind === 'guide') {
      await expect(this.breadcrumb.getByRole('listitem'), 'breadcrumb trail').toHaveText([
        text(this.locale, 'nav.home'),
        text(this.locale, 'footer.guides'),
        this.fixture.h1,
      ]);
      await expect(this.breadcrumb.getByRole('link', { name: this.fixture.h1 }), 'the page is not a link').toHaveCount(0);
    } else if (this.kind === 'feature' || this.kind === 'use-case') {
      await expect(this.breadcrumb.getByRole('listitem'), 'breadcrumb trail').toHaveText([
        text(this.locale, 'nav.home'),
        text(this.locale, 'nav.features'),
        this.fixture.h1,
      ]);
      await expect(this.breadcrumb.getByRole('link', { name: this.fixture.h1 }), 'the page is not a link').toHaveCount(0);
    } else {
      await expect(this.breadcrumb, 'hubs, how it works and comparisons show no breadcrumb').toHaveCount(0);
    }
  }

  // ----- comparison: the date and the table -----

  /** The day the other product's pages were read, as the page words it in this locale. */
  private get asOfDate(): string {
    const { asOf } = this.fixture;
    const day = asOf instanceof Date ? asOf.toISOString().slice(0, 10) : asOf!;
    return formatAsOf(day, this.locale, INTL[this.locale]);
  }

  /** The note under the hero says in plain sight when the other product's pages were read. */
  async expectAsOfDate(): Promise<void> {
    const note = this.main.getByText(this.fixture.asOfNote!.replace('{date}', this.asOfDate), { exact: true });
    await expect(note, 'the "as of" note under the hero').toBeVisible();
    await expect(note.getByText(this.asOfDate, { exact: true }), 'the date inside the note').toBeVisible();
  }

  /**
   * The side-by-side table is a real table named by its dated caption, with column headers, a row
   * header for every row, both sides of every row and a link to the page that row was read from.
   */
  async expectComparisonTable(): Promise<void> {
    const f = this.fixture;
    const table = f.table!;
    const caption = table.caption.replace('{date}', this.asOfDate);
    const grid = this.region(table.heading).getByRole('table', { name: caption, exact: true });
    await expect(grid, 'the side-by-side table, named by its dated caption').toBeVisible();
    await expect(grid.getByRole('columnheader'), 'table column headers').toHaveText([
      table.columns.feature,
      table.columns.other,
      table.columns.sideBadger,
    ]);
    await expect(grid.getByRole('rowheader'), 'table row headers, in order').toHaveText(table.rows.map(row => row.feature));
    await expect(grid.getByRole('row'), 'the header row and one row for each thing compared').toHaveCount(table.rows.length + 1);
    for (const row of table.rows) {
      const source = f.sources!.find(candidate => candidate.id === row.source)!;
      const line = grid.getByRole('row').filter({ has: this.page.getByRole('rowheader', { name: row.feature, exact: true }) });
      await expect(line.getByRole('cell').filter({ hasText: row.other }), `"${row.feature}": the other product's side`).toBeVisible();
      await expect(line.getByRole('cell').filter({ hasText: row.sideBadger }), `"${row.feature}": Side Badger's side`).toBeVisible();
      await expect(line.getByText(table.sourceLabel, { exact: true }), `"${row.feature}": the word before the source`).toBeVisible();
      const link = line.getByRole('link', { name: new RegExp(`^${escapeRegExp(source.label)}`) });
      await expect(link, `"${row.feature}": its source`).toBeVisible();
      await expect(link).toHaveAttribute('href', source.url);
    }
  }

  // ----- FAQ -----

  /** Every question is visible, with its answer, on the page. */
  async expectFaq(): Promise<void> {
    const faq = this.region(this.fixture.faq!.heading);
    await expect(faq.getByRole('heading', { level: 3 }), 'FAQ questions').toHaveText(this.fixture.faq!.items.map(i => i.q));
  }

  // ----- cards and related -----

  /** The hub's cards: its two child pages, as links titled with the pages' own headings. */
  async expectHubCards(): Promise<void> {
    const cards = this.region(this.fixture.cardsHeading!).getByRole('listitem');
    await expect(cards, 'hub cards').toHaveCount(2);
    for (const kind of ['feature', 'use-case'] as const) {
      const title = fixtureFor(kind, this.locale).h1;
      await expect(this.region(this.fixture.cardsHeading!).getByRole('link', { name: title, exact: true })).toBeVisible();
    }
  }

  /** A guide's related pages: the three product pages its registry entry names, in that order, as links titled with their own headings. */
  async expectRelatedProductPages(): Promise<void> {
    const titles = (['feature', 'use-case', 'how-it-works'] as const).map(kind => fixtureFor(kind, this.locale).h1);
    await expect(
      this.region(text(this.locale, 'related.heading')).getByRole('link'),
      'the product pages the guide links to'
    ).toHaveText(titles);
  }

  /** A product page lists the guide that names it, under its own heading, and the link goes to the guide. */
  async expectRelatedGuides(): Promise<void> {
    const guide = this.region(text(this.locale, 'related.guidesHeading')).getByRole('link');
    await expect(guide, 'the guides that name this page').toHaveText([fixtureFor('guide', this.locale).h1]);
    await expect(guide).toHaveAttribute('href', pathFor(this.locale, LAYOUT_ROUTES.guide));
  }

  // ----- worked example -----

  async expectWorkedExample(): Promise<void> {
    const example = this.fixture.example!;
    const region = this.region(example.heading!);
    const lines = exampleLines(example, this.locale);
    if (example.conversion) {
      // Both views, each labelled, and the rate labelled as illustrative
      for (const view of lines.separate) {
        await this.expectLedger(region, `${uiText(this.locale, 'example.separate')} `, view);
      }
      await this.expectLedger(
        region,
        `${uiText(this.locale, 'example.converted', { currency: example.currency })} `,
        lines.main,
        false
      );
      const money = moneyFormatter(INTL[this.locale]);
      for (const [from, rate] of Object.entries(example.conversion.rates)) {
        const label = uiText(this.locale, 'example.illustrativeRate', {
          from: money.major(1, from),
          to: money.major(rate, example.currency),
        });
        await expect(region.getByRole('listitem').filter({ hasText: label }), `rate label "${label}"`).toHaveCount(1);
      }
    } else {
      await this.expectLedger(region, '', lines.main);
    }
    await expect(region.getByText(text(this.locale, 'example.note'), { exact: true })).toBeVisible();
  }

  /** One ledger: its net balances, and its payment list (and, when it is longer, the list it replaces). */
  private async expectLedger(
    region: Locator,
    prefix: string,
    ledger: { currency: string; transfers: string[]; pairwise: string[] },
    currencyNamed = true
  ): Promise<void> {
    const currencyName = currencyNamed && prefix ? this.currencyName(ledger.currency) : '';
    const name = (heading: string) => new RegExp(`^${escapeRegExp(prefix)}${currencyName ? `${escapeRegExp(currencyName)} ` : ''}${escapeRegExp(heading)}$`);
    await expect(
      region.getByRole('list', { name: name(text(this.locale, 'example.transfers')) }).getByRole('listitem'),
      `suggested payments (${ledger.currency})`
    ).toHaveText(ledger.transfers);
    if (ledger.pairwise.length > ledger.transfers.length) {
      await expect(
        region.getByRole('list', { name: name(uiText(this.locale, 'example.pairwise')) }).getByRole('listitem'),
        `direct payments (${ledger.currency})`
      ).toHaveText(ledger.pairwise);
    }
  }

  private currencyName(code: string): string {
    return new Intl.DisplayNames(INTL[this.locale], { type: 'currency' }).of(code) ?? code;
  }

  /** The sentences of the worked example in plain words, for tests that state them in English. */
  async expectTransferLines(heading: string, lines: readonly string[]): Promise<void> {
    await expect(
      this.page.getByRole('list', { name: heading, exact: true }).getByRole('listitem'),
      `payments listed under "${heading}"`
    ).toHaveText(lines);
  }

  // ----- whole-page checks -----

  async expectNoHorizontalOverflow(): Promise<void> {
    await expect
      .poll(
        () =>
          this.page.evaluate(() => {
            const width = document.documentElement.clientWidth;
            const offenders: string[] = [];
            if (document.documentElement.scrollWidth > width) offenders.push('<html> scrolls sideways');
            for (const el of document.querySelectorAll<HTMLElement>('main *')) {
              const style = getComputedStyle(el);
              if (style.visibility === 'hidden' || style.display === 'none') continue;
              if (el.closest('.sr-only')) continue;
              const rect = el.getBoundingClientRect();
              if (rect.width === 0 || rect.height === 0) continue;
              if (rect.right > width + 1 || rect.left < -1) {
                offenders.push(`${el.tagName.toLowerCase()}.${el.className} [${Math.round(rect.left)}..${Math.round(rect.right)}] of ${width}`);
              }
            }
            return offenders;
          }),
        { message: 'nothing on the page should overflow the viewport', timeout: ELEMENT_TIMEOUT }
      )
      .toEqual([]);
  }

  async expectNoSeriousAccessibilityViolations(): Promise<void> {
    const results = await new AxeBuilder({ page: this.page }).analyze();
    const serious = results.violations
      .filter(v => v.impact === 'serious' || v.impact === 'critical')
      .map(v => ({ rule: v.id, impact: v.impact, targets: v.nodes.map(n => n.target.join(' ')) }));
    // axe returns its findings in one analysis; there is no element to poll
    expect(serious, 'serious or critical accessibility violations').toEqual([]);
  }

  async saveScreenshot(file: string): Promise<void> {
    await expect(this.closing, 'scroll the whole page into existence before the shot').toBeAttached();
    await this.page.screenshot({ path: file, fullPage: true });
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

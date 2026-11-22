import { expect, type Locator, type Page } from '@playwright/test';
import { isPseudoLocale, pseudoMeta, type PseudoLocale } from '../../src/i18n/pseudo';
import { ELEMENT_TIMEOUT } from './timeouts';
import { LOCALE_NAMES, text, type ShellLocale } from './strings';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * The header's language switcher: a disclosure nav (a button, a search box and a group of links),
 * not a listbox. ArrowDown on the button opens it and enters the list; Escape closes it and returns
 * focus to the button.
 */
export class LanguageSwitcher {
  constructor(
    private readonly page: Page,
    private readonly locale: ShellLocale
  ) {}

  private get header(): Locator {
    return this.page.getByRole('banner');
  }

  private get button(): Locator {
    // The name is "Change language: <language>"; the visible language name is part of it
    return this.header.getByRole('button', {
      name: new RegExp(`^${escapeRegExp(text(this.locale, 'a11y.changeLanguage'))}`),
    });
  }

  private get search(): Locator {
    return this.header.getByRole('textbox', { name: text(this.locale, 'a11y.searchLanguages') });
  }

  private get options(): Locator {
    return this.header
      .getByRole('group', { name: text(this.locale, 'a11y.changeLanguage') })
      .getByRole('link');
  }

  /**
   * The button's tooltip (Tooltip.astro), shown where the button shows only its flag. Departs from
   * rule 2: the tooltip is aria-hidden (the button's name already says it), so no role or name
   * finds it, and its text is also inside the button. The anchor and text carry data-tooltip and
   * data-tooltip-text, which the site's own tooltip script uses; nothing perceivable is unique.
   */
  private get tooltip(): Locator {
    return this.header
      .locator('[data-tooltip]')
      .filter({ has: this.page.getByRole('button', { name: new RegExp(`^${escapeRegExp(text(this.locale, 'a11y.changeLanguage'))}`) }) })
      .locator('[data-tooltip-text]');
  }

  private get homeLink(): Locator {
    return this.header.getByRole('link', { name: text(this.locale, 'a11y.homeLink') });
  }

  /**
   * Where the button shows only its flag, its name shows as a tooltip on hover and on keyboard
   * focus, and Escape closes it. `name` is the expected name; by default, the button's own.
   */
  async expectTooltipOnHoverAndFocus(name?: string): Promise<void> {
    await this.verifyLoaded();
    await expect(this.tooltip, 'the language tooltip before hovering').toBeHidden();
    await this.button.hover();
    await expect(this.tooltip, 'the language tooltip on hover').toBeVisible();
    await expect(this.tooltip, 'it starts with the button label').toHaveText(
      new RegExp(`^${escapeRegExp(text(this.locale, 'a11y.changeLanguage'))}: \\S`)
    );
    if (name) await expect(this.tooltip, 'the tooltip names the language').toHaveText(name);
    // The tooltip, read once it has shown, must be exactly the button's accessible name
    const shown = ((await this.tooltip.textContent()) ?? '').trim();
    await expect(this.button, 'the tooltip says what the name says').toHaveAccessibleName(shown);
    await this.page.getByRole('main').hover();
    await expect(this.tooltip, 'the language tooltip once the pointer leaves').toBeHidden();
    await this.homeLink.focus();
    await this.page.keyboard.press('Tab');
    await expect(this.button, 'Tab from the logo reaches the language button').toBeFocused();
    await expect(this.tooltip, 'the language tooltip on keyboard focus').toBeVisible();
    await this.page.keyboard.press('Escape');
    await expect(this.tooltip, 'Escape closes the language tooltip').toBeHidden();
    await expect(this.button, 'Escape leaves the switcher closed').toHaveAttribute('aria-expanded', 'false');
  }

  /** Where the button shows the language's name, there is no tooltip to repeat it */
  async expectNoTooltip(): Promise<void> {
    await this.verifyLoaded();
    await this.button.hover();
    await expect(this.tooltip, 'no language tooltip on hover where the name shows').toBeHidden();
    await this.button.focus();
    await expect(this.tooltip, 'no language tooltip on focus where the name shows').toBeHidden();
  }

  /** While the menu is open, the button's tooltip stays closed: the menu is showing */
  async expectTooltipClosedWhileOpen(): Promise<void> {
    await this.button.hover();
    await expect(this.tooltip, 'the tooltip on hover before opening').toBeVisible();
    await this.openWithClick();
    await expect(this.tooltip, 'no tooltip over the open menu').toBeHidden();
    await this.closeWithEscape();
  }

  /** The option for a pseudo-locale, by its display name */
  private optionNamed(name: string): Locator {
    return this.options.filter({ hasText: name });
  }

  async expectButtonVisible(): Promise<void> {
    await expect(this.button, 'the language button').toBeVisible();
  }

  async verifyLoaded(): Promise<void> {
    await expect(this.button, 'language switcher button').toBeVisible({ timeout: ELEMENT_TIMEOUT });
    await expect(this.button, 'switcher starts closed').toHaveAttribute('aria-expanded', 'false');
  }

  /** Index of the focused option among the visible options, or -1 when focus is elsewhere. */
  private async focusedOptionPosition(): Promise<number> {
    return this.page.evaluate(() => {
      const visible = Array.from(
        document.querySelectorAll<HTMLElement>('.language-switcher .language-option')
      ).filter(option => option.style.display !== 'none');
      return visible.indexOf(document.activeElement as HTMLElement);
    });
  }

  private async visibleOptionCount(): Promise<number> {
    return this.page.evaluate(
      () =>
        Array.from(
          document.querySelectorAll<HTMLElement>('.language-switcher .language-option')
        ).filter(option => option.style.display !== 'none').length
    );
  }

  /** Where focus sits in the list: a position, or `last`. Polls, because focus moves after the key. */
  async expectFocusedOption(position: number | 'last'): Promise<void> {
    await expect
      .poll(
        async () => {
          const at = await this.focusedOptionPosition();
          return position === 'last' ? at === (await this.visibleOptionCount()) - 1 && at >= 0 : at === position;
        },
        { message: `focus should be on option ${position} of the language list`, timeout: ELEMENT_TIMEOUT }
      )
      .toBe(true);
  }

  async focusButton(): Promise<void> {
    await this.verifyLoaded();
    await this.button.focus();
    await expect(this.button, 'the switcher button should take focus').toBeFocused();
  }

  async openWithArrowDown(): Promise<void> {
    await expect(this.button).toBeFocused();
    await this.page.keyboard.press('ArrowDown');
    await expect(this.button).toHaveAttribute('aria-expanded', 'true');
    await this.expectFocusedOption(0);
  }

  async moveDownTo(position: number): Promise<void> {
    await this.page.keyboard.press('ArrowDown');
    await this.expectFocusedOption(position);
  }

  async jumpToEnd(): Promise<void> {
    await this.page.keyboard.press('End');
    await this.expectFocusedOption('last');
  }

  async jumpToStart(): Promise<void> {
    await this.page.keyboard.press('Home');
    await this.expectFocusedOption(0);
  }

  async closeWithEscape(): Promise<void> {
    await expect(this.button).toHaveAttribute('aria-expanded', 'true');
    await this.page.keyboard.press('Escape');
    await expect(this.button, 'Escape should close the switcher').toHaveAttribute('aria-expanded', 'false');
    await expect(this.button, 'focus should return to the switcher button').toBeFocused();
    await expect(this.options.filter({ visible: true }), 'the options should be hidden again').toHaveCount(0);
  }

  async openWithClick(): Promise<void> {
    await expect(this.button).toHaveAttribute('aria-expanded', 'false');
    await this.button.click();
    await expect(this.button).toHaveAttribute('aria-expanded', 'true');
    await expect(this.search, 'clicking the button should focus the search box').toBeFocused();
  }

  /** Types in the search box, then checks that the named pseudo-locale stays and another goes. */
  async filterTo(query: string, kept: PseudoLocale, dropped: PseudoLocale): Promise<void> {
    await expect(this.search).toHaveValue('');
    await this.search.fill(query);
    await expect(this.search).toHaveValue(query);
    await expect(this.optionNamed(pseudoMeta[kept].name), `option ${kept} should match "${query}"`).toBeVisible();
    await expect(this.optionNamed(pseudoMeta[dropped].name), `option ${dropped} should be filtered out`).toBeHidden();
  }

  /** Every option is a link with a locale href, and the current language is marked. */
  async expectOptionsAreLinks(): Promise<void> {
    await expect(this.button).toHaveAttribute('aria-expanded', 'true');
    // Each pseudo-locale links to the same page in that locale
    for (const locale of ['xx-long', 'xx-ar', 'xx-ja', 'xx-hi'] as const) {
      await expect(this.optionNamed(pseudoMeta[locale].name)).toHaveAttribute('href', new RegExp(`^/${locale}/`));
    }
  }

  async expectCurrentOption(): Promise<void> {
    await expect(this.button).toHaveAttribute('aria-expanded', 'true');
    // English pages show "English (actual)" as the current choice, among the regional variants
    const name =
      this.locale === 'en'
        ? 'English (actual)'
        : isPseudoLocale(this.locale)
          ? pseudoMeta[this.locale].name
          : LOCALE_NAMES[this.locale];
    await expect(this.options.and(this.page.getByRole('link', { name, exact: true }))).toHaveAttribute(
      'aria-current',
      'true'
    );
  }
}

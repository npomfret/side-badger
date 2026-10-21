import { expect, type Locator, type Page } from '@playwright/test';
import { ELEMENT_TIMEOUT } from './timeouts';
import { text } from './strings';
import { ToolLayoutPage, ToolPage } from './toolBase';

const PATH = '/split-bill-calculator/';

export type SplitMethod = 'Equally' | 'By exact amounts' | 'By percentage';

/**
 * The split-bill calculator (release 2, R3). The words are the English page's, written out. The
 * entry points are `navigateTo`, `navigateToWithoutClipboard` and `openLink`; every action waits for
 * its own effect. What every calculator page shares (the result's summary, the share link, the
 * record of requests, axe) is in `ToolPage`.
 */
export class ToolsPage extends ToolPage {
  private constructor(page: Page) {
    super(page, PATH, 'Work out who pays whom');
  }

  /** The calculator, ready for input */
  static async navigateTo(page: Page): Promise<ToolsPage> {
    return ToolsPage.open(page, PATH);
  }

  /** A link someone copied, or any address on this page: the figures come from its fragment */
  static async openLink(page: Page, link: string): Promise<ToolsPage> {
    return ToolsPage.open(page, link);
  }

  /**
   * The calculator in a browser with no clipboard API, such as an insecure page. The API is the
   * browser's, outside the app, so it is removed at that boundary before the page loads.
   */
  static async navigateToWithoutClipboard(page: Page): Promise<ToolsPage> {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
    });
    return ToolsPage.open(page, PATH);
  }

  private static async open(page: Page, address: string): Promise<ToolsPage> {
    const tools = new ToolsPage(page);
    await page.goto(address);
    await tools.verifyLoaded();
    tools.markLoaded();
    return tools;
  }

  /** The script has started: it builds the first person, so that field is the sign it is ready */
  async verifyLoaded(): Promise<void> {
    await this.expectOnPage('Split bill calculator');
    await expect(this.personField(1), 'the calculator has not started (no first person)').toBeVisible();
  }

  // ----- locators, built fresh on every use -----

  private get people(): Locator {
    return this.calculator.getByRole('region', { name: 'People', exact: true });
  }

  private get expenses(): Locator {
    return this.calculator.getByRole('region', { name: 'Expenses', exact: true });
  }

  private get currency(): Locator {
    return this.calculator.getByRole('combobox', { name: 'Currency', exact: true });
  }

  private personField(position: number): Locator {
    return this.people.getByRole('textbox', { name: `Person ${position}`, exact: true });
  }

  private get addPersonButton(): Locator {
    return this.people.getByRole('button', { name: 'Add person', exact: true });
  }

  private removePersonButton(position: number): Locator {
    return this.people.getByRole('button', { name: `Remove person ${position}`, exact: true });
  }

  private expense(position: number): Locator {
    return this.expenses.getByRole('group', { name: `Expense ${position}`, exact: true });
  }

  private get addExpenseButton(): Locator {
    return this.expenses.getByRole('button', { name: 'Add expense', exact: true });
  }

  private labelField(expense: number): Locator {
    return this.expense(expense).getByRole('textbox', { name: 'What was it for?', exact: true });
  }

  private payerField(expense: number): Locator {
    return this.expense(expense).getByRole('combobox', { name: 'Paid by', exact: true });
  }

  private amountField(expense: number): Locator {
    return this.expense(expense).getByRole('textbox', { name: 'Amount', exact: true });
  }

  private splitField(expense: number): Locator {
    return this.expense(expense).getByRole('combobox', { name: 'How to split', exact: true });
  }

  private shares(expense: number): Locator {
    return this.expense(expense).getByRole('group', { name: 'Shared between', exact: true });
  }

  private shareTick(expense: number, person: string): Locator {
    return this.shares(expense).getByRole('checkbox', { name: person, exact: true });
  }

  private shareField(expense: number, kind: 'Amount' | 'Percentage', person: string): Locator {
    return this.shares(expense).getByRole('textbox', { name: `${kind} for ${person}`, exact: true });
  }

  private get balances(): Locator {
    return this.result.getByRole('list', { name: 'Net balances' }).getByRole('listitem');
  }

  private get payments(): Locator {
    return this.result.getByRole('list', { name: 'Who pays whom' }).getByRole('listitem');
  }

  // ----- people -----

  async expectPeople(names: string[]): Promise<void> {
    await this.stillOnTheCalculator('expectPeople');
    for (const [index, name] of names.entries()) {
      await expect(this.personField(index + 1), `person ${index + 1}`).toHaveValue(name);
    }
    await expect(this.personField(names.length + 1), `there is no person ${names.length + 1}`).toHaveCount(0);
  }

  /** Add a person, who becomes person `position`. Focus moves to their name. */
  async addPerson(position: number): Promise<void> {
    await this.stillOnTheCalculator('addPerson');
    await expect(this.personField(position), `person ${position} before adding`).toHaveCount(0);
    await expect(this.addPersonButton).toBeEnabled();
    await this.addPersonButton.click();
    await expect(this.personField(position), `person ${position} after adding`).toBeFocused();
  }

  /**
   * The third person, from the keyboard alone: leave the second person's name with Tab, which with
   * two people lands on Add person (the remove buttons are off), then press Enter.
   */
  async addThirdPersonWithKeyboard(): Promise<void> {
    await this.stillOnTheCalculator('addThirdPersonWithKeyboard');
    await expect(this.personField(3), 'person 3 before adding').toHaveCount(0);
    await this.personField(2).click();
    await expect(this.personField(2)).toBeFocused();
    await this.page.keyboard.press('Tab');
    await expect(this.addPersonButton).toBeFocused();
    await this.page.keyboard.press('Enter');
    await expect(this.personField(3), 'person 3 after adding').toBeFocused();
  }

  async renamePerson(position: number, from: string, to: string): Promise<void> {
    await this.stillOnTheCalculator('renamePerson');
    await expect(this.personField(position)).toHaveValue(from);
    await this.personField(position).fill(to);
    await expect(this.personField(position)).toHaveValue(to);
  }

  async removePerson(position: number): Promise<void> {
    await this.stillOnTheCalculator('removePerson');
    await expect(this.removePersonButton(position)).toBeEnabled();
    await this.removePersonButton(position).click();
  }

  /** The most people: Add person is off and the limit is stated */
  async expectPeopleLimitReached(limit: number): Promise<void> {
    await expect(this.addPersonButton).toBeDisabled();
    await expect(this.people.getByText(`The calculator takes up to ${limit} people.`)).toBeVisible();
    await expect(this.personField(limit), `person ${limit}`).toBeVisible();
    await expect(this.personField(limit + 1), `there is no person ${limit + 1}`).toHaveCount(0);
  }

  /** Two people is the least: nobody can be removed below it */
  async expectCannotRemovePeople(): Promise<void> {
    await expect(this.removePersonButton(1)).toBeDisabled();
    await expect(this.removePersonButton(2)).toBeDisabled();
  }

  // ----- the currency -----

  /** Choose a currency by its option text, such as `JPY · Japanese Yen` */
  async chooseCurrency(from: string, to: string): Promise<void> {
    await this.stillOnTheCalculator('chooseCurrency');
    await expect(this.currency.getByRole('option', { name: from, selected: true })).toBeAttached();
    await this.currency.selectOption({ label: to });
    await expect(this.currency.getByRole('option', { name: to, selected: true })).toBeAttached();
  }

  // ----- expenses -----

  /** Add an expense, which becomes expense `position`. Focus moves to what it was for. */
  async addExpense(position: number): Promise<void> {
    await this.stillOnTheCalculator('addExpense');
    await expect(this.expense(position), `expense ${position} before adding`).toHaveCount(0);
    await expect(this.addExpenseButton).toBeEnabled();
    await this.addExpenseButton.click();
    await expect(this.labelField(position), `expense ${position} after adding`).toBeFocused();
  }

  async removeExpense(position: number): Promise<void> {
    await this.stillOnTheCalculator('removeExpense');
    const remove = this.expense(position).getByRole('button', { name: `Remove expense ${position}`, exact: true });
    await expect(remove).toBeEnabled();
    await remove.click();
  }

  async expectExpenseLabel(expense: number, label: string): Promise<void> {
    await expect(this.labelField(expense), `what expense ${expense} was for`).toHaveValue(label);
  }

  async setAmount(expense: number, amount: string): Promise<void> {
    await this.stillOnTheCalculator('setAmount');
    await expect(this.amountField(expense)).toBeEditable();
    await this.amountField(expense).fill(amount);
    await expect(this.amountField(expense)).toHaveValue(amount);
  }

  async expectAmount(expense: number, amount: string): Promise<void> {
    await expect(this.amountField(expense), `the amount of expense ${expense}`).toHaveValue(amount);
  }

  async choosePayer(expense: number, name: string): Promise<void> {
    await this.stillOnTheCalculator('choosePayer');
    await expect(this.payerField(expense).getByRole('option', { name, selected: true }), `${name} is not yet the payer`).toHaveCount(0);
    await this.payerField(expense).selectOption({ label: name });
    await expect(this.payerField(expense).getByRole('option', { name, selected: true })).toBeAttached();
  }

  async expectNobodyChosenAsPayer(expense: number): Promise<void> {
    await expect(this.payerField(expense).getByRole('option', { name: 'Choose who paid', selected: true })).toBeAttached();
  }

  async chooseSplit(expense: number, method: SplitMethod): Promise<void> {
    await this.stillOnTheCalculator('chooseSplit');
    await expect(this.splitField(expense).getByRole('option', { name: method, selected: true }), `${method} is not yet the split`).toHaveCount(0);
    await this.splitField(expense).selectOption({ label: method });
    await expect(this.splitField(expense).getByRole('option', { name: method, selected: true })).toBeAttached();
  }

  async setShare(expense: number, kind: 'Amount' | 'Percentage', person: string, value: string): Promise<void> {
    await this.stillOnTheCalculator('setShare');
    await expect(this.shareField(expense, kind, person)).toBeEditable();
    await this.shareField(expense, kind, person).fill(value);
    await expect(this.shareField(expense, kind, person)).toHaveValue(value);
  }

  async untick(expense: number, person: string): Promise<void> {
    await this.stillOnTheCalculator('untick');
    await expect(this.shareTick(expense, person), `${person} shares expense ${expense}`).toBeChecked();
    await this.shareTick(expense, person).uncheck();
    await expect(this.shareTick(expense, person)).not.toBeChecked();
  }

  /** Who shares expense `expense`, in order, and whether each is ticked */
  async expectShared(expense: number, ticked: Record<string, boolean>): Promise<void> {
    for (const [person, on] of Object.entries(ticked)) {
      if (on) await expect(this.shareTick(expense, person), `${person} in expense ${expense}`).toBeChecked();
      else await expect(this.shareTick(expense, person), `${person} in expense ${expense}`).not.toBeChecked();
    }
  }

  // ----- errors and the result -----

  /** A message under an expense's field, which that field is described by */
  async expectAmountError(expense: number, message: string): Promise<void> {
    await expect(this.expense(expense).getByText(message, { exact: true })).toBeVisible();
    await expect(this.amountField(expense)).toHaveAccessibleDescription(message);
  }

  async expectNoAmountError(expense: number): Promise<void> {
    await expect(this.amountField(expense)).toHaveAccessibleDescription('');
  }

  async expectSharesError(expense: number, message: string): Promise<void> {
    await expect(this.expense(expense).getByText(message, { exact: true })).toBeVisible();
    await expect(this.shares(expense)).toHaveAccessibleDescription(message);
  }

  async expectNoSharesError(expense: number): Promise<void> {
    await expect(this.shares(expense)).toHaveAccessibleDescription('');
  }

  async expectPayerError(expense: number, message: string): Promise<void> {
    await expect(this.expense(expense).getByText(message, { exact: true })).toBeVisible();
    await expect(this.payerField(expense)).toHaveAccessibleDescription(message);
  }

  async expectPersonError(position: number, message: string): Promise<void> {
    await expect(this.people.getByText(message, { exact: true })).toBeVisible();
    await expect(this.personField(position)).toHaveAccessibleDescription(message);
  }

  /** No balances or payments, and a line saying what is missing */
  async expectNoResult(reason: 'incomplete' | 'no expenses' = 'incomplete'): Promise<void> {
    await expect(this.summary).toHaveText(
      reason === 'incomplete'
        ? 'Complete every field above and the result will appear here.'
        : 'Add an expense and the result will appear here.'
    );
    await expect(this.result.getByRole('list', { name: 'Net balances' })).toHaveCount(0);
    await expect(this.result.getByRole('list', { name: 'Who pays whom' })).toHaveCount(0);
  }

  async expectBalances(balances: string[]): Promise<void> {
    await this.expectShowing('The balances', () => expect(this.balances).toHaveText(balances), () => this.balances.allInnerTexts());
  }

  async expectPayments(payments: string[]): Promise<void> {
    await this.expectShowing('The payments', () => expect(this.payments).toHaveText(payments), () => this.payments.allInnerTexts());
  }

  async expectPaymentCount(count: number): Promise<void> {
    await this.expectShowing('The payments', () => expect(this.payments).toHaveCount(count), () => this.payments.allInnerTexts());
  }

  async expectBalanceCount(count: number): Promise<void> {
    await expect(this.balances).toHaveCount(count);
  }

  // ----- the share link -----

  /** A calculation over the link's size cap gets a message, not a link */
  async copyLinkExpectingTooLarge(): Promise<void> {
    await this.stillOnTheCalculator('copyLinkExpectingTooLarge');
    await expect(this.result.getByText('This calculation is too big for a link. Remove a few expenses and try again.')).toHaveCount(0);
    await this.copyLinkButton.click();
    await expect(this.result.getByText('This calculation is too big for a link. Remove a few expenses and try again.')).toBeVisible();
    await expect(this.linkField).toBeHidden();
    await this.expectAddressWithoutLink();
  }

  /** The three labelled parts the calculator is made of, and the link to the app under the result */
  async expectLayout(): Promise<void> {
    await expect(this.people).toBeVisible();
    await expect(this.expenses).toBeVisible();
    await expect(this.result).toBeVisible();
    await expect(this.startGroupLink).toBeVisible();
  }
}

/**
 * The calculator in the preview pseudo-locales (`xx-long`, `xx-ar`), to check that long text and
 * right-to-left text lay out. The pseudo-locales have no fixed words to write out, so this page
 * object takes the two button names from the generated text of the English source.
 */
export class ToolsLayoutPage extends ToolLayoutPage {
  private constructor(page: Page, locale: 'xx-long' | 'xx-ar') {
    super(page, locale, PATH);
  }

  static async navigateTo(page: Page, locale: 'xx-long' | 'xx-ar'): Promise<ToolsLayoutPage> {
    const layout = new ToolsLayoutPage(page, locale);
    await page.goto(layout.address());
    await layout.verifyLoaded();
    return layout;
  }

  async verifyLoaded(): Promise<void> {
    await this.expectOnPage();
    await expect(this.addPersonButton, 'the calculator has not started').toBeEnabled();
    await expect(this.firstPersonField).toBeVisible();
  }

  private get addPersonButton(): Locator {
    return this.page.getByRole('main').getByRole('button', { name: text(this.locale, 'tools.split.addPerson'), exact: true });
  }

  private get addExpenseButton(): Locator {
    return this.page.getByRole('main').getByRole('button', { name: text(this.locale, 'tools.split.addExpense'), exact: true });
  }

  private get secondExpenseRemoveButton(): Locator {
    return this.page.getByRole('main').getByRole('button', { name: text(this.locale, 'tools.split.removeExpense').replace('{number}', '2'), exact: true });
  }

  private get firstPersonField(): Locator {
    return this.page.getByRole('main').getByRole('textbox', { name: text(this.locale, 'tools.split.personLabel').replace('{number}', '1'), exact: true });
  }

  /** Three people and two expenses, so every kind of row is on the page */
  async fillOut(): Promise<void> {
    await this.addPersonButton.click();
    await this.addExpenseButton.click();
    await expect(this.secondExpenseRemoveButton, 'the second expense').toBeVisible();
  }
}

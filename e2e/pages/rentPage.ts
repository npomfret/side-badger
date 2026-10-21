import { expect, type Locator, type Page } from '@playwright/test';
import { text } from './strings';
import { ToolLayoutPage, ToolPage } from './toolBase';

const PATH = '/rent-split-calculator/';

export type RentMode = 'By room size' | 'By income';
/** The label of a person's figure in each mode */
export type Figure = 'Bedroom area' | 'Income';

/**
 * The rent calculator (release 2, P9). The words are the English page's, written out. The entry
 * points are `navigateTo`, `navigateToWithoutClipboard` and `openLink`; every action waits for its
 * own effect. What every calculator page shares (the summary, the share link, the record of
 * requests, axe) is in `ToolPage`.
 */
export class RentPage extends ToolPage {
  private constructor(page: Page) {
    super(page, PATH, "Work out everyone's share");
  }

  /** The calculator, ready for input */
  static async navigateTo(page: Page): Promise<RentPage> {
    return RentPage.open(page, PATH);
  }

  /** A link someone copied, or any address on this page: the figures come from its fragment */
  static async openLink(page: Page, link: string): Promise<RentPage> {
    return RentPage.open(page, link);
  }

  /**
   * The calculator in a browser with no clipboard API, such as an insecure page. The API is the
   * browser's, outside the app, so it is removed at that boundary before the page loads.
   */
  static async navigateToWithoutClipboard(page: Page): Promise<RentPage> {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
    });
    return RentPage.open(page, PATH);
  }

  private static async open(page: Page, address: string): Promise<RentPage> {
    const rent = new RentPage(page);
    await page.goto(address);
    await rent.verifyLoaded();
    rent.markLoaded();
    return rent;
  }

  /** The script has started: it builds the first person, so that group is the sign it is ready */
  async verifyLoaded(): Promise<void> {
    await this.expectOnPage('Rent split calculator');
    await expect(this.person(1), 'the calculator has not started (no first person)').toBeVisible();
  }

  // ----- locators, built fresh on every use -----

  private get rentPanel(): Locator {
    return this.calculator.getByRole('region', { name: 'The rent', exact: true });
  }

  private get people(): Locator {
    return this.calculator.getByRole('region', { name: 'People', exact: true });
  }

  private get modeGroup(): Locator {
    return this.rentPanel.getByRole('group', { name: 'Split the rent', exact: true });
  }

  private modeChoice(mode: RentMode): Locator {
    return this.modeGroup.getByRole('radio', { name: mode, exact: true });
  }

  private get rentField(): Locator {
    return this.rentPanel.getByRole('textbox', { name: 'Rent', exact: true });
  }

  private get billsField(): Locator {
    return this.rentPanel.getByRole('textbox', { name: 'Shared bills (optional)', exact: true });
  }

  private get sharedField(): Locator {
    return this.rentPanel.getByRole('textbox', { name: 'Share of the rent for shared rooms', exact: true });
  }

  private get unitField(): Locator {
    return this.rentPanel.getByRole('combobox', { name: 'Floor area unit', exact: true });
  }

  private get currency(): Locator {
    return this.rentPanel.getByRole('combobox', { name: 'Currency', exact: true });
  }

  private person(position: number): Locator {
    return this.people.getByRole('group', { name: `Person ${position}`, exact: true });
  }

  private nameField(position: number): Locator {
    return this.person(position).getByRole('textbox', { name: 'Name', exact: true });
  }

  private figureField(position: number, figure: Figure): Locator {
    return this.person(position).getByRole('textbox', { name: figure, exact: true });
  }

  private get addPersonButton(): Locator {
    return this.people.getByRole('button', { name: 'Add person', exact: true });
  }

  private removePersonButton(position: number): Locator {
    return this.person(position).getByRole('button', { name: `Remove person ${position}`, exact: true });
  }

  private get shares(): Locator {
    return this.result.getByRole('list', { name: 'Who pays what', exact: true }).getByRole('listitem');
  }

  private get appStep(): Locator {
    return this.result.getByText(/^In Side Badger, choose/);
  }

  // ----- people -----

  async expectPeople(names: string[]): Promise<void> {
    await this.stillOnTheCalculator('expectPeople');
    for (const [index, name] of names.entries()) {
      await expect(this.nameField(index + 1), `person ${index + 1}`).toHaveValue(name);
    }
    await expect(this.person(names.length + 1), `there is no person ${names.length + 1}`).toHaveCount(0);
  }

  /** Add a person, who becomes person `position`. Focus moves to their name. */
  async addPerson(position: number): Promise<void> {
    await this.stillOnTheCalculator('addPerson');
    await expect(this.person(position), `person ${position} before adding`).toHaveCount(0);
    await expect(this.addPersonButton).toBeEnabled();
    await this.addPersonButton.click();
    await expect(this.nameField(position), `person ${position} after adding`).toBeFocused();
  }

  /**
   * The third person, from the keyboard alone: leave the second person's name with Tab, which lands
   * on their figure, then Tab again, which with two people lands on Add person (the remove buttons
   * are off), then press Enter.
   */
  async addThirdPersonWithKeyboard(): Promise<void> {
    await this.stillOnTheCalculator('addThirdPersonWithKeyboard');
    await expect(this.person(3), 'person 3 before adding').toHaveCount(0);
    await this.nameField(2).click();
    await expect(this.nameField(2)).toBeFocused();
    await this.page.keyboard.press('Tab');
    await expect(this.person(2).getByRole('textbox', { name: /^(Bedroom area|Income)$/ })).toBeFocused();
    await this.page.keyboard.press('Tab');
    await expect(this.addPersonButton).toBeFocused();
    await this.page.keyboard.press('Enter');
    await expect(this.nameField(3), 'person 3 after adding').toBeFocused();
  }

  async renamePerson(position: number, from: string, to: string): Promise<void> {
    await this.stillOnTheCalculator('renamePerson');
    await expect(this.nameField(position)).toHaveValue(from);
    await this.nameField(position).fill(to);
    await expect(this.nameField(position)).toHaveValue(to);
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
    await expect(this.person(limit), `person ${limit}`).toBeVisible();
    await expect(this.person(limit + 1), `there is no person ${limit + 1}`).toHaveCount(0);
  }

  /** Two people is the least: nobody can be removed below it */
  async expectCannotRemovePeople(): Promise<void> {
    await expect(this.removePersonButton(1)).toBeDisabled();
    await expect(this.removePersonButton(2)).toBeDisabled();
  }

  // ----- the mode -----

  async chooseMode(mode: RentMode): Promise<void> {
    await this.stillOnTheCalculator('chooseMode');
    await expect(this.modeChoice(mode), `${mode} is not yet the mode`).not.toBeChecked();
    await this.modeChoice(mode).check();
    await expect(this.modeChoice(mode)).toBeChecked();
  }

  async expectMode(mode: RentMode): Promise<void> {
    await expect(this.modeChoice(mode), `the mode is ${mode}`).toBeChecked();
  }

  /** By room size: the share for the shared rooms and the unit are asked for, bills are not, and each person gives a bedroom area */
  async expectRoomSizeFields(people: number): Promise<void> {
    await expect(this.sharedField).toBeVisible();
    await expect(this.unitField).toBeVisible();
    await expect(this.billsField, 'the shared bills field, which only income uses').toHaveCount(0);
    for (let position = 1; position <= people; position++) {
      await expect(this.figureField(position, 'Bedroom area'), `person ${position}'s bedroom area`).toBeVisible();
    }
  }

  /** By income: bills are asked for, the shared rooms and the unit are not, and each person gives an income */
  async expectIncomeFields(people: number): Promise<void> {
    await expect(this.billsField).toBeVisible();
    await expect(this.sharedField, 'the share for shared rooms, which only room size uses').toHaveCount(0);
    await expect(this.unitField, 'the floor area unit, which only room size uses').toHaveCount(0);
    for (let position = 1; position <= people; position++) {
      await expect(this.figureField(position, 'Income'), `person ${position}'s income`).toBeVisible();
    }
  }

  // ----- the rent and what goes with it -----

  async setRent(amount: string): Promise<void> {
    await this.stillOnTheCalculator('setRent');
    await expect(this.rentField).toBeEditable();
    await this.rentField.fill(amount);
    await expect(this.rentField).toHaveValue(amount);
  }

  async expectRent(amount: string): Promise<void> {
    await expect(this.rentField, 'the rent').toHaveValue(amount);
  }

  async setBills(amount: string): Promise<void> {
    await this.stillOnTheCalculator('setBills');
    await expect(this.billsField, 'the shared bills field (by income only)').toBeEditable();
    await this.billsField.fill(amount);
    await expect(this.billsField).toHaveValue(amount);
  }

  async expectBills(amount: string): Promise<void> {
    await expect(this.billsField, 'the shared bills').toHaveValue(amount);
  }

  async setShared(percentage: string): Promise<void> {
    await this.stillOnTheCalculator('setShared');
    await expect(this.sharedField, 'the share for shared rooms (by room size only)').toBeEditable();
    await this.sharedField.fill(percentage);
    await expect(this.sharedField).toHaveValue(percentage);
  }

  async expectShared(percentage: string): Promise<void> {
    await expect(this.sharedField, 'the share for shared rooms').toHaveValue(percentage);
  }

  /** Choose the unit of the floor area by its option text, `m²` or `ft²`. It is a label only. */
  async chooseUnit(from: 'm²' | 'ft²', to: 'm²' | 'ft²'): Promise<void> {
    await this.stillOnTheCalculator('chooseUnit');
    await expect(this.unitField.getByRole('option', { name: from, selected: true })).toBeAttached();
    await this.unitField.selectOption({ label: to });
    await expect(this.unitField.getByRole('option', { name: to, selected: true })).toBeAttached();
  }

  async expectUnit(unit: 'm²' | 'ft²'): Promise<void> {
    await expect(this.unitField.getByRole('option', { name: unit, selected: true }), `the unit is ${unit}`).toBeAttached();
  }

  /** Choose a currency by its option text, such as `JPY · Japanese Yen` */
  async chooseCurrency(from: string, to: string): Promise<void> {
    await this.stillOnTheCalculator('chooseCurrency');
    await expect(this.currency.getByRole('option', { name: from, selected: true })).toBeAttached();
    await this.currency.selectOption({ label: to });
    await expect(this.currency.getByRole('option', { name: to, selected: true })).toBeAttached();
  }

  /** The figure that sizes person `position`'s share: a bedroom area by room size, an income by income */
  async setFigure(position: number, figure: Figure, value: string): Promise<void> {
    await this.stillOnTheCalculator('setFigure');
    await expect(this.figureField(position, figure), `person ${position}'s ${figure.toLowerCase()}`).toBeEditable();
    await this.figureField(position, figure).fill(value);
    await expect(this.figureField(position, figure)).toHaveValue(value);
  }

  async expectFigure(position: number, figure: Figure, value: string): Promise<void> {
    await expect(this.figureField(position, figure), `person ${position}'s ${figure.toLowerCase()}`).toHaveValue(value);
  }

  // ----- errors -----

  /** A message under a field, which that field is described by */
  private async expectFieldError(field: Locator, panel: Locator, message: string): Promise<void> {
    await expect(panel.getByText(message, { exact: true })).toBeVisible();
    await expect(field).toHaveAccessibleDescription(message);
  }

  async expectRentError(message: string): Promise<void> {
    await this.expectFieldError(this.rentField, this.rentPanel, message);
  }

  async expectNoRentError(): Promise<void> {
    await expect(this.rentField).toHaveAccessibleDescription('');
  }

  async expectBillsError(message: string): Promise<void> {
    await this.expectFieldError(this.billsField, this.rentPanel, message);
  }

  async expectNoBillsError(): Promise<void> {
    await expect(this.billsField).toHaveAccessibleDescription('');
  }

  async expectSharedError(message: string): Promise<void> {
    await this.expectFieldError(this.sharedField, this.rentPanel, message);
  }

  async expectNoSharedError(): Promise<void> {
    await expect(this.sharedField).toHaveAccessibleDescription('');
  }

  async expectNameError(position: number, message: string): Promise<void> {
    await this.expectFieldError(this.nameField(position), this.person(position), message);
  }

  async expectFigureError(position: number, figure: Figure, message: string): Promise<void> {
    await this.expectFieldError(this.figureField(position, figure), this.person(position), message);
  }

  async expectNoFigureError(position: number, figure: Figure): Promise<void> {
    await expect(this.figureField(position, figure)).toHaveAccessibleDescription('');
  }

  // ----- the result -----

  /** No shares, and a line saying what is missing */
  async expectNoResult(): Promise<void> {
    await expect(this.summary).toHaveText('Complete every field above and the result will appear here.');
    await expect(this.result.getByRole('list', { name: 'Who pays what', exact: true })).toHaveCount(0);
    await expect(this.appStep, 'the sentence about the app, which waits for a result').toBeHidden();
  }

  /** Each person's row, in order: name, whole percentage, amounts and exact share */
  async expectShares(shares: string[]): Promise<void> {
    await this.expectShowing('The shares', () => expect(this.shares).toHaveText(shares), () => this.shares.allInnerTexts());
  }

  async expectShareCount(count: number): Promise<void> {
    await this.expectShowing('The shares', () => expect(this.shares).toHaveCount(count), () => this.shares.allInnerTexts());
  }

  /** The sentence under the result that says what to type into the app, in the app's own words */
  async expectAppStep(sentence: string): Promise<void> {
    await this.expectShowing('The app step', () => expect(this.appStep).toHaveText(sentence), () => this.appStep.allInnerTexts());
  }

  /** The line that says to do the same for the bills: only when there are bills to share */
  async expectAppBillsLine(showing: boolean): Promise<void> {
    const line = this.result.getByText('Do the same for any bills you share this way.');
    if (showing) await expect(line).toBeVisible();
    else await expect(line).toBeHidden();
  }

  async expectZeroNote(note: string): Promise<void> {
    await expect(this.result.getByText(note, { exact: true })).toBeVisible();
  }

  async expectNoZeroNote(): Promise<void> {
    await expect(this.result.getByText(/^Check the 0% for /)).toBeHidden();
  }

  /** The three labelled parts the calculator is made of, and the link to the app under the result */
  async expectLayout(): Promise<void> {
    await expect(this.rentPanel).toBeVisible();
    await expect(this.people).toBeVisible();
    await expect(this.result).toBeVisible();
    await expect(this.startGroupLink).toBeVisible();
  }
}

/**
 * The calculator in the preview pseudo-locales (`xx-long`, `xx-ar`), to check that long text and
 * right-to-left text lay out. The pseudo-locales have no fixed words to write out, so this page
 * object takes its field names from the generated text of the English source.
 */
export class RentLayoutPage extends ToolLayoutPage {
  private constructor(page: Page, locale: 'xx-long' | 'xx-ar') {
    super(page, locale, PATH);
  }

  static async navigateTo(page: Page, locale: 'xx-long' | 'xx-ar'): Promise<RentLayoutPage> {
    const layout = new RentLayoutPage(page, locale);
    await page.goto(layout.address());
    await layout.verifyLoaded();
    return layout;
  }

  async verifyLoaded(): Promise<void> {
    await this.expectOnPage();
    await expect(this.addPersonButton, 'the calculator has not started').toBeEnabled();
    await expect(this.person(1)).toBeVisible();
  }

  private words(key: Parameters<typeof text>[1]): string {
    return text(this.locale, key);
  }

  private get main(): Locator {
    return this.page.getByRole('main');
  }

  private get rentPanel(): Locator {
    return this.main.getByRole('region', { name: this.words('tools.rent.rentHeading'), exact: true });
  }

  private get addPersonButton(): Locator {
    return this.main.getByRole('button', { name: this.words('tools.split.addPerson'), exact: true });
  }

  private person(position: number): Locator {
    return this.main.getByRole('group', { name: this.words('tools.split.personLabel').replace('{number}', String(position)), exact: true });
  }

  private figure(position: number, key: 'tools.rent.area' | 'tools.rent.income'): Locator {
    return this.person(position).getByRole('textbox', { name: this.words(key), exact: true });
  }

  /**
   * The result's rows. The pseudo-locales write a heading as letters by position, so "Who pays what"
   * and the worked example's "Who pays whom" come out the same: the search starts in the calculator.
   */
  private get shares(): Locator {
    return this.main
      .getByRole('region', { name: this.words('tools.rent.heading'), exact: true })
      .getByRole('list', { name: this.words('tools.rent.sharesHeading'), exact: true })
      .getByRole('listitem');
  }

  /**
   * Three people with figures by room size, then the same by income with bills, so the longest
   * result row (rent, bills and total) is on the page.
   */
  async fillOut(): Promise<void> {
    await this.addPersonButton.click();
    await expect(this.person(3), 'the third person').toBeVisible();
    await this.rentPanel.getByRole('textbox', { name: this.words('tools.rent.rent'), exact: true }).fill('1950');
    for (const [position, area] of [[1, '16'], [2, '12'], [3, '10']] as const) {
      await this.figure(position, 'tools.rent.area').fill(area);
    }
    await expect(this.shares, 'the result by room size').toHaveCount(3);

    await this.main.getByRole('radio', { name: this.words('tools.rent.modeIncome'), exact: true }).check();
    await this.rentPanel.getByRole('textbox', { name: this.words('tools.rent.bills'), exact: true }).fill('180');
    for (const [position, income] of [[1, '2800'], [2, '1700'], [3, '1250']] as const) {
      await this.figure(position, 'tools.rent.income').fill(income);
    }
    await expect(this.shares, 'the result by income').toHaveCount(3);
  }
}

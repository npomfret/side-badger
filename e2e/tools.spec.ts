import { test } from '@playwright/test';
import { ToolsLayoutPage, ToolsPage } from './pages/toolsPage';

/**
 * The split-bill calculator (release 2, R3): people and expenses in, balances and a short list of
 * payments out, validation beside each field, a share link that carries the figures in the URL
 * fragment, and no request to any server. The server builds with PREVIEW_UNPUBLISHED=1 (see
 * playwright.config.ts), because the page is not published yet.
 */
test.describe('split bill calculator', () => {
  // The share link is read back from the clipboard, as a visitor pasting it would
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

  test('opens ready for input, with two people and one expense and nothing to show yet', async ({ page }) => {
    const calculator = await ToolsPage.navigateTo(page);
    await calculator.expectLayout();
    await calculator.expectPeople(['Ana', 'Ben']);
    await calculator.expectExpenseLabel(1, 'Dinner');
    await calculator.expectAmount(1, '');
    await calculator.expectNoResult();
    await calculator.expectCannotRemovePeople();
    await calculator.expectStartGroupLink();
    await calculator.expectAddressWithoutLink();
  });

  test('three people and two expenses give each balance and a short list of payments', async ({ page }) => {
    const calculator = await ToolsPage.navigateTo(page);
    await calculator.addPerson(3);
    await calculator.expectPeople(['Ana', 'Ben', 'Cara']);

    // Ana pays £90 for dinner, split three ways: Ben and Cara each owe her £30
    await calculator.setAmount(1, '90');
    await calculator.expectBalances(['Ana +£60.00', 'Ben -£30.00', 'Cara -£30.00']);
    await calculator.expectPayments(['Ben pays Ana £30.00', 'Cara pays Ana £30.00']);

    // Ben pays £30 for the taxi, so Ana is owed less and Ben owes less
    await calculator.addExpense(2);
    await calculator.expectExpenseLabel(2, 'Taxi');
    await calculator.choosePayer(2, 'Ben');
    await calculator.setAmount(2, '30');
    await calculator.expectBalances(['Ana +£50.00', 'Ben -£10.00', 'Cara -£40.00']);
    await calculator.expectPayments(['Cara pays Ana £40.00', 'Ben pays Ana £10.00']);
    await calculator.expectSummary('Payments to settle up: 2. Total spent: £120.00.');
  });

  test('a person left out of an expense owes nothing for it', async ({ page }) => {
    const calculator = await ToolsPage.navigateTo(page);
    await calculator.addPerson(3);
    await calculator.setAmount(1, '60');
    await calculator.untick(1, 'Cara');
    await calculator.expectShared(1, { Ana: true, Ben: true, Cara: false });
    await calculator.expectBalances(['Ana +£30.00', 'Ben -£30.00', 'Cara £0.00']);
    await calculator.expectPayments(['Ben pays Ana £30.00']);
  });

  test('renaming a person changes the result and the lists that name them', async ({ page }) => {
    const calculator = await ToolsPage.navigateTo(page);
    await calculator.setAmount(1, '50');
    await calculator.expectBalances(['Ana +£25.00', 'Ben -£25.00']);
    await calculator.renamePerson(2, 'Ben', 'Beatrix');
    await calculator.expectPayments(['Beatrix pays Ana £25.00']);
    await calculator.expectShared(1, { Ana: true, Beatrix: true });
  });

  test('everyone square needs no payments', async ({ page }) => {
    const calculator = await ToolsPage.navigateTo(page);
    await calculator.setAmount(1, '40');
    await calculator.addExpense(2);
    await calculator.choosePayer(2, 'Ben');
    await calculator.setAmount(2, '40');
    await calculator.expectSummary('Everyone is square. No payments needed. Total spent: £80.00.');
    await calculator.expectBalances(['Ana £0.00', 'Ben £0.00']);
    await calculator.expectPaymentCount(0);
  });

  test('exact amounts that do not add up show an error and no result until they do', async ({ page }) => {
    const calculator = await ToolsPage.navigateTo(page);
    await calculator.setAmount(1, '90');
    await calculator.chooseSplit(1, 'By exact amounts');
    await calculator.setShare(1, 'Amount', 'Ana', '50');
    await calculator.setShare(1, 'Amount', 'Ben', '30');
    await calculator.expectSharesError(1, 'The amounts add up to £80.00, but the expense is £90.00.');
    await calculator.expectNoResult();

    await calculator.setShare(1, 'Amount', 'Ben', '40');
    await calculator.expectNoSharesError(1);
    await calculator.expectBalances(['Ana +£40.00', 'Ben -£40.00']);
    await calculator.expectPayments(['Ben pays Ana £40.00']);
  });

  test('percentages that do not make 100 show an error, and 100 gives the result', async ({ page }) => {
    const calculator = await ToolsPage.navigateTo(page);
    await calculator.setAmount(1, '200');
    await calculator.chooseSplit(1, 'By percentage');
    await calculator.setShare(1, 'Percentage', 'Ana', '60');
    await calculator.setShare(1, 'Percentage', 'Ben', '30');
    await calculator.expectSharesError(1, 'The percentages add up to 90%, not 100%.');
    await calculator.expectNoResult();

    await calculator.setShare(1, 'Percentage', 'Ben', '40');
    await calculator.expectNoSharesError(1);
    await calculator.expectBalances(['Ana +£80.00', 'Ben -£80.00']);
  });

  test('an amount over the cap is refused, and the cap itself is allowed', async ({ page }) => {
    const calculator = await ToolsPage.navigateTo(page);
    await calculator.setAmount(1, '1000000');
    await calculator.expectAmountError(1, 'One expense can be up to £999,999.99.');
    await calculator.expectNoResult();

    await calculator.setAmount(1, '999999.99');
    await calculator.expectNoAmountError(1);
    await calculator.expectSummary('Payments to settle up: 1. Total spent: £999,999.99.');
  });

  test('says what is wrong with an amount: none, not a number, zero, too many decimals', async ({ page }) => {
    const calculator = await ToolsPage.navigateTo(page);
    await calculator.setAmount(1, 'twelve');
    await calculator.expectAmountError(1, 'Enter a number, such as 12.50.');
    await calculator.setAmount(1, '0');
    await calculator.expectAmountError(1, 'The amount must be more than zero.');
    await calculator.setAmount(1, '10.005');
    await calculator.expectAmountError(1, 'GBP takes up to 2 decimal places.');
    await calculator.setAmount(1, '10,50');
    await calculator.expectNoAmountError(1);
    await calculator.expectBalances(['Ana +£5.25', 'Ben -£5.25']);
  });

  test('a currency with no minor unit takes whole amounts only', async ({ page }) => {
    const calculator = await ToolsPage.navigateTo(page);
    await calculator.chooseCurrency('GBP · British Pound', 'JPY · Japanese Yen');
    await calculator.setAmount(1, '1500.5');
    await calculator.expectAmountError(1, 'JPY takes up to 0 decimal places.');
    await calculator.setAmount(1, '3000');
    await calculator.expectBalances(['Ana +¥1,500', 'Ben -¥1,500']);
  });

  test('two people with the same name are refused', async ({ page }) => {
    const calculator = await ToolsPage.navigateTo(page);
    await calculator.setAmount(1, '20');
    await calculator.renamePerson(2, 'Ben', 'ana');
    await calculator.expectPersonError(2, 'Two people are called ana. Give them different names.');
    await calculator.expectNoResult();
  });

  test('removing the person who paid asks who paid', async ({ page }) => {
    const calculator = await ToolsPage.navigateTo(page);
    await calculator.addPerson(3);
    await calculator.setAmount(1, '90');
    await calculator.addExpense(2);
    await calculator.choosePayer(2, 'Cara');
    await calculator.setAmount(2, '30');
    await calculator.expectSummary('Payments to settle up: 2. Total spent: £120.00.');

    await calculator.removePerson(3);
    await calculator.expectPeople(['Ana', 'Ben']);
    await calculator.expectNobodyChosenAsPayer(2);
    await calculator.expectPayerError(2, 'Choose who paid.');
    await calculator.expectNoResult();

    await calculator.choosePayer(2, 'Ben');
    await calculator.expectBalances(['Ana +£30.00', 'Ben -£30.00']);
  });

  test('with every expense removed, it asks for one', async ({ page }) => {
    const calculator = await ToolsPage.navigateTo(page);
    await calculator.removeExpense(1);
    await calculator.expectNoResult('no expenses');
    await calculator.addExpense(1);
    await calculator.expectNoResult();
  });

  test('takes up to twenty people, and settles a villa among all of them', async ({ page }) => {
    const calculator = await ToolsPage.navigateTo(page);
    for (let position = 3; position <= 20; position++) await calculator.addPerson(position);
    await calculator.expectPeopleLimitReached(20);
    await calculator.setAmount(1, '2000');
    await calculator.expectBalanceCount(20);
    await calculator.expectSummary('Payments to settle up: 19. Total spent: £2,000.00.');
    await calculator.expectPaymentCount(19);
  });

  test('can be driven from the keyboard', async ({ page }) => {
    const calculator = await ToolsPage.navigateTo(page);
    await calculator.addThirdPersonWithKeyboard();
    await calculator.expectPeople(['Ana', 'Ben', 'Cara']);
  });

  test('a copied link opens the same calculation in a fresh page', async ({ context }) => {
    const calculator = await ToolsPage.navigateTo(await context.newPage());
    await calculator.addPerson(3);
    await calculator.renamePerson(3, 'Cara', 'Zoë');
    await calculator.setAmount(1, '90');
    await calculator.addExpense(2);
    await calculator.choosePayer(2, 'Ben');
    await calculator.setAmount(2, '30');
    await calculator.chooseSplit(2, 'By exact amounts');
    await calculator.setShare(2, 'Amount', 'Ana', '5');
    await calculator.setShare(2, 'Amount', 'Ben', '10');
    await calculator.untick(2, 'Zoë');
    await calculator.expectSharesError(2, 'The amounts add up to £15.00, but the expense is £30.00.');
    await calculator.setShare(2, 'Amount', 'Ben', '25');
    // Dinner: Ana +£60, Ben and Zoë -£30 each. Taxi: Ben paid £30 and owes £25, Ana owes £5.
    await calculator.expectBalances(['Ana +£55.00', 'Ben -£25.00', 'Zoë -£30.00']);
    await calculator.expectPayments(['Zoë pays Ana £30.00', 'Ben pays Ana £25.00']);

    const link = await calculator.copyLink();
    await calculator.expectAddressHoldsLink();

    const fresh = await ToolsPage.openLink(await context.newPage(), link);
    await fresh.expectPeople(['Ana', 'Ben', 'Zoë']);
    await fresh.expectExpenseLabel(1, 'Dinner');
    await fresh.expectAmount(1, '90');
    await fresh.expectExpenseLabel(2, 'Taxi');
    await fresh.expectAmount(2, '30');
    await fresh.expectShared(2, { Ana: true, Ben: true, Zoë: false });
    await fresh.expectBalances(['Ana +£55.00', 'Ben -£25.00', 'Zoë -£30.00']);
    await fresh.expectPayments(['Zoë pays Ana £30.00', 'Ben pays Ana £25.00']);
    await fresh.expectSummary('Payments to settle up: 2. Total spent: £120.00.');
  });

  test('a link with a mistake in it keeps the mistake, and shows it', async ({ context }) => {
    const calculator = await ToolsPage.navigateTo(await context.newPage());
    await calculator.setAmount(1, 'lots');
    await calculator.expectAmountError(1, 'Enter a number, such as 12.50.');
    const link = await calculator.copyLink();

    const fresh = await ToolsPage.openLink(await context.newPage(), link);
    await fresh.expectAmount(1, 'lots');
    await fresh.expectAmountError(1, 'Enter a number, such as 12.50.');
    await fresh.expectNoResult();
  });

  for (const [name, link] of [
    ['not a link at all', '/split-bill-calculator/#c=not%20a%20link'],
    ['a payload that is not JSON', '/split-bill-calculator/#c=aGVsbG8'],
    ['text of the wrong shape', '/split-bill-calculator/#c=eyJ2IjoyfQ'],
    ['another fragment', '/split-bill-calculator/#main-content'],
  ]) {
    test(`a link that is ${name} starts a fresh calculation`, async ({ page }) => {
      const calculator = await ToolsPage.openLink(page, link);
      await calculator.expectPeople(['Ana', 'Ben']);
      await calculator.expectAmount(1, '');
      await calculator.expectNoResult();
    });
  }

  test('an oversize link is ignored', async ({ page }) => {
    const calculator = await ToolsPage.openLink(page, `/split-bill-calculator/#c=${'A'.repeat(5000)}`);
    await calculator.expectPeople(['Ana', 'Ben']);
    await calculator.expectNoResult();
  });

  test('says so when a calculation is too big to share as a link', async ({ page }) => {
    const calculator = await ToolsPage.navigateTo(page);
    for (let position = 3; position <= 20; position++) await calculator.addPerson(position);
    for (let position = 2; position <= 40; position++) await calculator.addExpense(position);
    await calculator.copyLinkExpectingTooLarge();
  });

  test('nothing leaves the browser while someone works and copies the link', async ({ page }) => {
    const calculator = await ToolsPage.navigateTo(page);
    await calculator.setAmount(1, '45.50');
    await calculator.addExpense(2);
    await calculator.setAmount(2, '12');
    await calculator.copyLink();
    await calculator.expectSummary('Payments to settle up: 1. Total spent: £57.50.');
    await calculator.expectNothingLeftTheBrowser();
  });

  test('axe finds nothing serious with a result showing, and with errors showing', async ({ page }) => {
    const calculator = await ToolsPage.navigateTo(page);
    await calculator.setAmount(1, '90');
    await calculator.expectBalances(['Ana +£45.00', 'Ben -£45.00']);
    await calculator.expectNoSeriousAccessibilityViolations();

    await calculator.chooseSplit(1, 'By exact amounts');
    await calculator.setShare(1, 'Amount', 'Ana', '50');
    await calculator.setShare(1, 'Amount', 'Ben', '30');
    await calculator.expectSharesError(1, 'The amounts add up to £80.00, but the expense is £90.00.');
    await calculator.setAmount(1, '1000000');
    await calculator.expectAmountError(1, 'One expense can be up to £999,999.99.');
    await calculator.expectNoSeriousAccessibilityViolations();
  });
});

test.describe('without a clipboard', () => {
  test('shows the link to copy by hand, and that link opens the same calculation', async ({ context }) => {
    const calculator = await ToolsPage.navigateToWithoutClipboard(await context.newPage());
    await calculator.setAmount(1, '80');
    await calculator.expectBalances(['Ana +£40.00', 'Ben -£40.00']);
    const link = await calculator.copyLinkByHand();

    const fresh = await ToolsPage.openLink(await context.newPage(), link);
    await fresh.expectAmount(1, '80');
    await fresh.expectBalances(['Ana +£40.00', 'Ben -£40.00']);
  });
});

// Long text and right-to-left text, at a phone's width and a desktop's
for (const locale of ['xx-long', 'xx-ar'] as const) {
  for (const viewport of [
    { name: '390', size: { width: 390, height: 844 } },
    { name: '1280', size: { width: 1280, height: 900 } },
  ]) {
    test.describe(`${locale} at ${viewport.name}`, () => {
      test.use({ viewport: viewport.size });

      test('lays out without anything past the edge of the page', async ({ page }) => {
        const layout = await ToolsLayoutPage.navigateTo(page, locale);
        await layout.expectNoHorizontalOverflow();
        await layout.fillOut();
        await layout.expectNoHorizontalOverflow();
      });
    });
  }
}

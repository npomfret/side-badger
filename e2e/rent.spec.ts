import { test } from '@playwright/test';
import { RentLayoutPage, RentPage } from './pages/rentPage';

/**
 * The rent calculator (release 2, P9): the rent shared by room size or by income, each person's
 * exact share, whole percentage (totalling 100) and amount, the sentence that says what to type
 * into the app, validation beside each field, a share link that carries the figures in the URL
 * fragment, and no request to any server. The server builds with PREVIEW_UNPUBLISHED=1 (see
 * playwright.config.ts), because the page is not published yet.
 */
const FLAT = [
  'Priya 39% Rent £760.50 38.60% exact share',
  'Tom 32% Rent £624.00 32.28% exact share',
  'Aisha 29% Rent £565.50 29.12% exact share',
];
const COUPLE = [
  'Maya 62% Rent £868.00 · Bills £111.60 · Total £979.60 62.22% exact share',
  'Jon 38% Rent £532.00 · Bills £68.40 · Total £600.40 37.78% exact share',
];

/** Guide 1's flat: £1,950 rent and bedrooms of 16, 12 and 10 m² */
async function setUpTheFlat(rent: RentPage): Promise<void> {
  await rent.addPerson(3);
  await rent.renamePerson(1, 'Ana', 'Priya');
  await rent.renamePerson(2, 'Ben', 'Tom');
  await rent.renamePerson(3, 'Cara', 'Aisha');
  await rent.setRent('1950');
  await rent.setFigure(1, 'Bedroom area', '16');
  await rent.setFigure(2, 'Bedroom area', '12');
  await rent.setFigure(3, 'Bedroom area', '10');
}

/** Guide 4's couple, by income: £1,400 rent and £180 bills, shared by take-home pay of 2,800 and 1,700 */
async function setUpTheCouple(rent: RentPage): Promise<void> {
  await rent.renamePerson(1, 'Ana', 'Maya');
  await rent.renamePerson(2, 'Ben', 'Jon');
  await rent.setRent('1400');
  await rent.setBills('180');
  await rent.setFigure(1, 'Income', '2800');
  await rent.setFigure(2, 'Income', '1700');
}

test.describe('rent split calculator', () => {
  // The share link is read back from the clipboard, as a visitor pasting it would
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

  test('opens ready for input, by room size, with 40% for the shared rooms and nothing to show yet', async ({ page }) => {
    const rent = await RentPage.navigateTo(page);
    await rent.expectLayout();
    await rent.expectMode('By room size');
    await rent.expectRoomSizeFields(2);
    await rent.expectPeople(['Ana', 'Ben']);
    await rent.expectRent('');
    await rent.expectShared('40');
    await rent.expectUnit('m²');
    await rent.expectNoResult();
    await rent.expectCannotRemovePeople();
    await rent.expectStartGroupLink();
    await rent.expectAddressWithoutLink();
  });

  test('guide 1\'s flat: 39, 32 and 29 percent, and what to type into the app', async ({ page }) => {
    const rent = await RentPage.navigateTo(page);
    await rent.setRent('1950');
    await rent.expectNoResult();
    await setUpTheFlat(rent);

    await rent.expectShares(FLAT);
    await rent.expectSummary('Rent £1,950.00 shared out. The whole percentages add up to 100%.');
    await rent.expectAppStep('In Side Badger, choose Percentage under How to split and type Priya 39, Tom 32 and Aisha 29.');
    await rent.expectAppBillsLine(false);
    await rent.expectNoZeroNote();
  });

  test('the share for the shared rooms moves the split: all by bedroom size, and all equal', async ({ page }) => {
    const rent = await RentPage.navigateTo(page);
    await setUpTheFlat(rent);
    await rent.expectShares(FLAT);

    await rent.setShared('0');
    await rent.expectShares([
      'Priya 42% Rent £819.00 42.11% exact share',
      'Tom 32% Rent £624.00 31.58% exact share',
      'Aisha 26% Rent £507.00 26.32% exact share',
    ]);

    // Three equal shares of 100 leave one point over, which goes to the first name
    await rent.setShared('100');
    await rent.expectShares([
      'Priya 34% Rent £663.00 33.33% exact share',
      'Tom 33% Rent £643.50 33.33% exact share',
      'Aisha 33% Rent £643.50 33.33% exact share',
    ]);
    await rent.expectAppStep('In Side Badger, choose Percentage under How to split and type Priya 34, Tom 33 and Aisha 33.');
  });

  test('the unit of the floor area is a label: square feet give the same shares', async ({ page }) => {
    const rent = await RentPage.navigateTo(page);
    await setUpTheFlat(rent);
    await rent.expectShares(FLAT);
    await rent.chooseUnit('m²', 'ft²');
    await rent.expectUnit('ft²');
    await rent.expectShares(FLAT);
  });

  test('by income, the bills follow the rent: guide 4\'s couple is 62 and 38 percent', async ({ page }) => {
    const rent = await RentPage.navigateTo(page);
    await rent.expectRoomSizeFields(2);
    await rent.chooseMode('By income');
    await rent.expectIncomeFields(2);
    await setUpTheCouple(rent);

    await rent.expectShares(COUPLE);
    await rent.expectSummary('Rent £1,400.00 and bills £180.00 shared out. The whole percentages add up to 100%.');
    await rent.expectAppStep('In Side Badger, choose Percentage under How to split and type Maya 62 and Jon 38.');
    await rent.expectAppBillsLine(true);

    // No bills, no bills line: the rent alone
    await rent.setBills('');
    await rent.expectShares([
      'Maya 62% Rent £868.00 62.22% exact share',
      'Jon 38% Rent £532.00 37.78% exact share',
    ]);
    await rent.expectSummary('Rent £1,400.00 shared out. The whole percentages add up to 100%.');
    await rent.expectAppBillsLine(false);
  });

  test('each mode keeps its own figures when the mode is changed and changed back', async ({ page }) => {
    const rent = await RentPage.navigateTo(page);
    await setUpTheFlat(rent);
    await rent.setRent('1950');

    await rent.chooseMode('By income');
    await rent.expectIncomeFields(3);
    await rent.expectFigure(1, 'Income', '');
    await rent.expectNoFigureError(1, 'Income');
    await rent.expectRent('1950');
    await rent.expectNoResult();

    await rent.setFigure(1, 'Income', '2000');
    await rent.chooseMode('By room size');
    await rent.expectRoomSizeFields(3);
    await rent.expectFigure(1, 'Bedroom area', '16');
    await rent.expectShares(FLAT);

    await rent.chooseMode('By income');
    await rent.expectFigure(1, 'Income', '2000');
  });

  test('equal figures leave the odd points to the first names, and the amounts still add up', async ({ page }) => {
    const rent = await RentPage.navigateTo(page);
    await rent.addPerson(3);
    await rent.chooseMode('By income');
    await rent.setRent('1000');
    for (const position of [1, 2, 3]) await rent.setFigure(position, 'Income', '1000');
    await rent.expectShares([
      'Ana 34% Rent £340.00 33.33% exact share',
      'Ben 33% Rent £330.00 33.33% exact share',
      'Cara 33% Rent £330.00 33.33% exact share',
    ]);
  });

  test('takes up to ten people, who share the rent in whole percentages that total 100', async ({ page }) => {
    const names = ['Ana', 'Ben', 'Cara', 'Dev', 'Eli', 'Fay', 'Gus', 'Hana', 'Ivy', 'Jo'];
    const rent = await RentPage.navigateTo(page);
    for (let position = 3; position <= 10; position++) await rent.addPerson(position);
    await rent.expectPeopleLimitReached(10);
    await rent.expectPeople(names);
    await rent.chooseMode('By income');
    await rent.setRent('1000');
    for (let position = 1; position <= 10; position++) await rent.setFigure(position, 'Income', '1000');
    await rent.expectShareCount(10);
    await rent.expectShares(names.map(name => `${name} 10% Rent £100.00 10.00% exact share`));
  });

  test('a share that rounds down to nothing is pointed out', async ({ page }) => {
    const rent = await RentPage.navigateTo(page);
    await rent.chooseMode('By income');
    await rent.setRent('1000');
    await rent.setFigure(1, 'Income', '1');
    await rent.setFigure(2, 'Income', '1000000');
    await rent.expectShares([
      'Ana 0% Rent £0.00 0.00% exact share',
      'Ben 100% Rent £1,000.00 100.00% exact share',
    ]);
    await rent.expectZeroNote('Check the 0% for Ana. That is what their share rounds down to.');
    await rent.expectAppStep('In Side Badger, choose Percentage under How to split and type Ana 0 and Ben 100.');

    await rent.setFigure(1, 'Income', '1000000');
    await rent.expectNoZeroNote();
  });

  test('removing a person recalculates for the people who are left', async ({ page }) => {
    const rent = await RentPage.navigateTo(page);
    await rent.addPerson(3);
    await rent.chooseMode('By income');
    await rent.setRent('600');
    await rent.setFigure(1, 'Income', '1000');
    await rent.setFigure(2, 'Income', '1000');
    await rent.setFigure(3, 'Income', '1000');
    await rent.expectShares([
      'Ana 34% Rent £204.00 33.33% exact share',
      'Ben 33% Rent £198.00 33.33% exact share',
      'Cara 33% Rent £198.00 33.33% exact share',
    ]);

    await rent.removePerson(2);
    await rent.expectPeople(['Ana', 'Cara']);
    await rent.expectShares(['Ana 50% Rent £300.00 50.00% exact share', 'Cara 50% Rent £300.00 50.00% exact share']);
  });

  test('says what is wrong with the rent: none, not a number, zero, too much, too many decimals', async ({ page }) => {
    const rent = await RentPage.navigateTo(page);
    await rent.setRent('lots');
    await rent.expectRentError('Enter a number, such as 12.50.');
    await rent.setRent('0');
    await rent.expectRentError('The amount must be more than zero.');
    await rent.setRent('1000000');
    await rent.expectRentError('One expense can be up to £999,999.99.');
    await rent.setRent('10.005');
    await rent.expectRentError('GBP takes up to 2 decimal places.');
    await rent.setRent('');
    await rent.expectRentError('Enter the amount.');
    await rent.setRent('999999.99');
    await rent.expectNoRentError();
    await rent.setRent('1950,50');
    await rent.expectNoRentError();
  });

  test('the share for the shared rooms must be a percentage from 0 to 100', async ({ page }) => {
    const rent = await RentPage.navigateTo(page);
    await rent.setShared('101');
    await rent.expectSharedError('Enter a percentage from 0 to 100.');
    await rent.setShared('lots');
    await rent.expectSharedError('Enter a percentage from 0 to 100.');
    await rent.setShared('0');
    await rent.expectNoSharedError();
    await rent.setShared('100');
    await rent.expectNoSharedError();
  });

  test('bedroom areas and incomes must be more than zero, and no more than the calculator takes', async ({ page }) => {
    const rent = await RentPage.navigateTo(page);
    await rent.setFigure(1, 'Bedroom area', '0');
    await rent.expectFigureError(1, 'Bedroom area', 'Enter a number more than zero.');
    await rent.setFigure(1, 'Bedroom area', 'big');
    await rent.expectFigureError(1, 'Bedroom area', 'Enter a number more than zero.');
    await rent.setFigure(1, 'Bedroom area', '100001');
    await rent.expectFigureError(1, 'Bedroom area', 'The calculator takes up to 100,000.');
    await rent.setFigure(1, 'Bedroom area', '100000');
    await rent.expectNoFigureError(1, 'Bedroom area');

    await rent.chooseMode('By income');
    await rent.setFigure(2, 'Income', '100000000');
    await rent.expectFigureError(2, 'Income', 'The calculator takes up to 99,999,999.');
    await rent.setFigure(2, 'Income', '99999999');
    await rent.expectNoFigureError(2, 'Income');
  });

  test('bills are optional, and must be an amount when given', async ({ page }) => {
    const rent = await RentPage.navigateTo(page);
    await rent.chooseMode('By income');
    await rent.setBills('lots');
    await rent.expectBillsError('Enter a number, such as 12.50.');
    await rent.setBills('1000000');
    await rent.expectBillsError('One expense can be up to £999,999.99.');
    await rent.setBills('0');
    await rent.expectNoBillsError();
  });

  test('a currency with no minor unit takes whole amounts only', async ({ page }) => {
    const rent = await RentPage.navigateTo(page);
    await setUpTheFlat(rent);
    await rent.chooseCurrency('GBP · British Pound', 'JPY · Japanese Yen');
    await rent.setRent('195000.5');
    await rent.expectRentError('JPY takes up to 0 decimal places.');
    await rent.setRent('195000');
    await rent.expectShares([
      'Priya 39% Rent ¥76,050 38.60% exact share',
      'Tom 32% Rent ¥62,400 32.28% exact share',
      'Aisha 29% Rent ¥56,550 29.12% exact share',
    ]);
  });

  test('two people with the same name are refused', async ({ page }) => {
    const rent = await RentPage.navigateTo(page);
    await rent.renamePerson(2, 'Ben', 'ana');
    await rent.expectNameError(2, 'Two people are called ana. Give them different names.');
    await rent.expectNoResult();
  });

  test('can be driven from the keyboard', async ({ page }) => {
    const rent = await RentPage.navigateTo(page);
    await rent.addThirdPersonWithKeyboard();
    await rent.expectPeople(['Ana', 'Ben', 'Cara']);
  });

  test('a copied link opens the same flat, by room size, in a fresh page', async ({ context }) => {
    const rent = await RentPage.navigateTo(await context.newPage());
    await setUpTheFlat(rent);
    await rent.chooseUnit('m²', 'ft²');
    await rent.expectShares(FLAT);

    const link = await rent.copyLink();
    await rent.expectAddressHoldsLink();

    const fresh = await RentPage.openLink(await context.newPage(), link);
    await fresh.expectMode('By room size');
    await fresh.expectPeople(['Priya', 'Tom', 'Aisha']);
    await fresh.expectRent('1950');
    await fresh.expectShared('40');
    await fresh.expectUnit('ft²');
    await fresh.expectFigure(1, 'Bedroom area', '16');
    await fresh.expectFigure(3, 'Bedroom area', '10');
    await fresh.expectShares(FLAT);
  });

  test('a copied link opens the same couple, by income, in a fresh page', async ({ context }) => {
    const rent = await RentPage.navigateTo(await context.newPage());
    await rent.chooseMode('By income');
    await setUpTheCouple(rent);
    await rent.expectShares(COUPLE);

    const link = await rent.copyLink();
    const fresh = await RentPage.openLink(await context.newPage(), link);
    await fresh.expectMode('By income');
    await fresh.expectPeople(['Maya', 'Jon']);
    await fresh.expectBills('180');
    await fresh.expectFigure(2, 'Income', '1700');
    await fresh.expectShares(COUPLE);
    await fresh.expectAppBillsLine(true);
  });

  test('a link with a mistake in it keeps the mistake, and shows it', async ({ context }) => {
    const rent = await RentPage.navigateTo(await context.newPage());
    await rent.setRent('lots');
    await rent.expectRentError('Enter a number, such as 12.50.');
    const link = await rent.copyLink();

    const fresh = await RentPage.openLink(await context.newPage(), link);
    await fresh.expectRent('lots');
    await fresh.expectRentError('Enter a number, such as 12.50.');
    await fresh.expectNoResult();
  });

  for (const [name, link] of [
    ['not a link at all', '/rent-split-calculator/#c=not%20a%20link'],
    ['a payload that is not JSON', '/rent-split-calculator/#c=aGVsbG8'],
    ['text of the wrong shape', '/rent-split-calculator/#c=eyJ2IjoyfQ'],
    ['another fragment', '/rent-split-calculator/#main-content'],
    // The split-bill calculator's own link: {"v":1,"c":"GBP","p":["Ana","Ben"],"e":[]}
    ['a split-bill calculator link', '/rent-split-calculator/#c=eyJ2IjoxLCJjIjoiR0JQIiwicCI6WyJBbmEiLCJCZW4iXSwiZSI6W119'],
  ]) {
    test(`a link that is ${name} starts a fresh calculation`, async ({ page }) => {
      const rent = await RentPage.openLink(page, link);
      await rent.expectMode('By room size');
      await rent.expectPeople(['Ana', 'Ben']);
      await rent.expectRent('');
      await rent.expectNoResult();
    });
  }

  test('an oversize link is ignored', async ({ page }) => {
    const rent = await RentPage.openLink(page, `/rent-split-calculator/#c=${'A'.repeat(5000)}`);
    await rent.expectPeople(['Ana', 'Ben']);
    await rent.expectNoResult();
  });

  test('nothing leaves the browser while someone works and copies the link', async ({ page }) => {
    const rent = await RentPage.navigateTo(page);
    await setUpTheFlat(rent);
    await rent.copyLink();
    await rent.expectShares(FLAT);
    await rent.expectNothingLeftTheBrowser();
  });

  test('axe finds nothing serious with a result showing, in both modes, and with errors showing', async ({ page }) => {
    const rent = await RentPage.navigateTo(page);
    await setUpTheFlat(rent);
    await rent.expectShares(FLAT);
    await rent.expectNoSeriousAccessibilityViolations();

    await rent.chooseMode('By income');
    await rent.setBills('180');
    await rent.setFigure(1, 'Income', '2800');
    await rent.setFigure(2, 'Income', '1700');
    await rent.setFigure(3, 'Income', '1250');
    await rent.expectShareCount(3);
    await rent.expectNoSeriousAccessibilityViolations();

    await rent.setRent('lots');
    await rent.expectRentError('Enter a number, such as 12.50.');
    await rent.setFigure(2, 'Income', '0');
    await rent.expectFigureError(2, 'Income', 'Enter a number more than zero.');
    await rent.expectNoSeriousAccessibilityViolations();
  });
});

test.describe('without a clipboard', () => {
  test('shows the link to copy by hand, and that link opens the same calculation', async ({ context }) => {
    const rent = await RentPage.navigateToWithoutClipboard(await context.newPage());
    await setUpTheFlat(rent);
    await rent.expectShares(FLAT);
    const link = await rent.copyLinkByHand();

    const fresh = await RentPage.openLink(await context.newPage(), link);
    await fresh.expectShares(FLAT);
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
        const layout = await RentLayoutPage.navigateTo(page, locale);
        await layout.expectNoHorizontalOverflow();
        await layout.fillOut();
        await layout.expectNoHorizontalOverflow();
      });
    });
  }
}

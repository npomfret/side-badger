/**
 * The rent calculator's page script (release 2, P9): the form, the live result and the share link.
 * It keeps the form in a `RentState` (`rent-engine.ts`), builds each person and each result row
 * from the `<template>`s in `RentCalculator.astro`, and recomputes with `calculate()` on every
 * change. Nothing is stored and nothing is requested: the only places the figures go are the page
 * and, when the visitor asks, the clipboard.
 *
 * Fields are rebuilt only when the structure changes (a person added or removed, a link opened),
 * never while someone types. An error shows once the visitor has been in its field, but the result
 * stays hidden while any error stands, whether it shows yet or not.
 *
 * At load the script only builds the form (restructure D36: at most 10 KB of script at load). The
 * engine, the share link and money formatting (`rent-deferred.ts`) are fetched on the visitor's
 * first touch of the form, or straight away when the page opens from a share link, in which case
 * the form is built once they are here. A fresh form needs none of them: its rent is empty, so all
 * it shows is the line that waits for it.
 */
import type { Money } from '../content/money';
import { pickName, splitList } from './form-input';
import type { RentProblem, RentProblemCode, RentResult, RentTarget } from './rent-engine';
import {
  MAX_RENT_PEOPLE,
  MIN_PEOPLE,
  MODES,
  UNITS,
  freshState,
  newPerson,
  valueOf,
  type Mode,
  type RentState,
  type Unit,
} from './rent-state';
import { HASH_PREFIX } from './share-hash';
import { cloneTemplate, fill, later, ref, spaceOut } from './tool-dom';

type Deferred = typeof import('./rent-deferred');

/** One fetch for every calculator on the page */
const deferred = later<Deferred>(() => import('./rent-deferred'));

interface Messages {
  personLabel: string;
  removePerson: string;
  defaultNames: string;
  area: string;
  income: string;
  copied: string;
  copyFailed: string;
  linkTooLarge: string;
  resultWaiting: string;
  summary: string;
  summaryBills: string;
  shareExact: string;
  rentAmount: string;
  billsAmount: string;
  totalAmount: string;
  appStep: string;
  appHow: string;
  appPercentage: string;
  zeroNote: string;
  errors: Record<RentProblemCode, string>;
}

const UNIT_TEXT: Record<Unit, string> = { m2: 'm²', ft2: 'ft²' };
/** The single fields (not a person's) that can show an error */
const FIELDS = ['rent', 'bills', 'shared'] as const;

function start(root: HTMLElement): void {
  const messages = JSON.parse(ref(root, 'messages').textContent ?? '{}') as Messages;
  const intl = root.dataset.intl ?? 'en';
  let formatter: Money | undefined;
  const moneyOf = (module: Deferred): Money => (formatter ??= module.moneyFormatter(intl));
  // Western digits in every locale, as the money is
  const numbers = { numberingSystem: 'latn' } as const;
  const wholePercent = new Intl.NumberFormat(intl, { ...numbers, style: 'percent' });
  const exactPercent = new Intl.NumberFormat(intl, { ...numbers, style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const count = new Intl.NumberFormat(intl, { ...numbers, maximumFractionDigits: 0 });
  // The English page is British English: no comma before the "and" of a list
  const listOf = new Intl.ListFormat(intl.startsWith('en') ? 'en-GB' : intl, { style: 'long', type: 'conjunction' });

  const modeChoices: Record<Mode, HTMLInputElement> = {
    room: ref<HTMLInputElement>(root, 'mode-room'),
    income: ref<HTMLInputElement>(root, 'mode-income'),
  };
  const field = {
    rent: ref<HTMLInputElement>(root, 'rent'),
    bills: ref<HTMLInputElement>(root, 'bills'),
    shared: ref<HTMLInputElement>(root, 'shared'),
  };
  const fieldError = {
    rent: ref(root, 'rentError'),
    bills: ref(root, 'billsError'),
    shared: ref(root, 'sharedError'),
  };
  const currencyBox = ref<HTMLSelectElement>(root, 'currency');
  const currencies = Array.from(currencyBox.options, option => option.value);
  const unitBox = ref<HTMLSelectElement>(root, 'unit');
  const peopleList = ref(root, 'people');
  const peopleLimit = ref(root, 'peopleLimit');
  const status = ref(root, 'status');
  const resultBox = ref(root, 'result');
  const sharesList = ref(root, 'shares');
  const zeroNote = ref(root, 'zeroNote');
  const appStep = ref(root, 'appStep');
  const appBills = ref(root, 'appBills');
  const shareStatus = ref(root, 'shareStatus');
  const linkBox = ref(root, 'linkBox');
  const linkInput = ref<HTMLInputElement>(root, 'link');
  const addPersonButton = root.querySelector<HTMLButtonElement>('button[data-action="add-person"]')!;
  const modeOnly = Array.from(root.querySelectorAll<HTMLElement>('[data-only]'));

  const namePool = splitList(messages.defaultNames);
  const personDefault = (number: number) => fill(messages.personLabel, { number });
  const template = (name: string): HTMLElement => cloneTemplate(root, name);

  let state: RentState;
  // Each person gets an id that outlives their position, to say which fields were visited
  let nextId = 1;
  let personIds: number[] = [];
  const visited = new Set<string>();
  let everythingVisited = false;

  // ----- state ----------------------------------------------------------------------------

  function fresh(): RentState {
    const names: string[] = [];
    for (let n = 0; n < MIN_PEOPLE; n++) names.push(pickName(namePool, names, personDefault));
    return freshState(root.dataset.currency ?? currencies[0], [names[0], names[1]]);
  }

  /** Replace the whole form: the first state, or one opened from a link */
  function load(next: RentState, fromLink: boolean): void {
    state = next;
    currencyBox.value = next.currency;
    unitBox.value = next.unit;
    field.rent.value = next.rent;
    field.bills.value = next.bills;
    field.shared.value = next.shared;
    personIds = next.people.map(() => nextId++);
    visited.clear();
    everythingVisited = fromLink;
    renderPeople();
    syncMode();
    // Without the engine this is the fresh form, which only waits for the rent
    if (deferred.module) refresh();
    else say(messages.resultWaiting);
  }

  /** The mode's own fields show, the other's hide, and every person's figure becomes the mode's */
  function syncMode(): void {
    root.dataset.mode = state.mode;
    for (const mode of MODES) modeChoices[mode].checked = mode === state.mode;
    for (const element of modeOnly) element.hidden = element.dataset.only !== state.mode;
    syncValues();
    syncPeopleText();
  }

  // ----- visited fields -----------------------------------------------------------------------

  const keyOf = (target: RentTarget): string => {
    if (target.kind === 'name') return `n${personIds[target.person]}`;
    if (target.kind === 'value') return `v${personIds[target.person]}`;
    return target.kind;
  };

  /** Record that the visitor has been in this field. Returns whether that was news. */
  function visit(element: HTMLElement): boolean {
    if (!(element instanceof HTMLInputElement)) return false;
    const row = element.closest<HTMLElement>('.rc-person');
    const id = row ? personIds[Number(row.dataset.index)] : 0;
    const name = element.dataset.ref ?? '';
    let key: string | undefined;
    if (row) key = name === 'name' ? `n${id}` : name === 'value' ? `v${id}` : undefined;
    else if ((FIELDS as readonly string[]).includes(name)) key = name;
    if (key === undefined || visited.has(key)) return false;
    visited.add(key);
    return true;
  }

  // ----- people -------------------------------------------------------------------------------

  const personText = (person: number) => state.people[person].name.trim() || personDefault(person + 1);

  function renderPeople(): void {
    peopleList.replaceChildren(
      ...state.people.map((_person, index) => {
        const row = template('person');
        const id = `rc-p${personIds[index]}`;
        row.dataset.index = String(index);
        const name = ref<HTMLInputElement>(row, 'name');
        name.id = `${id}-name`;
        ref<HTMLLabelElement>(row, 'nameLabel').htmlFor = name.id;
        const value = ref<HTMLInputElement>(row, 'value');
        value.id = `${id}-value`;
        ref<HTMLLabelElement>(row, 'valueLabel').htmlFor = value.id;
        ref(row, 'nameError').id = `${id}-name-error`;
        ref(row, 'valueError').id = `${id}-value-error`;
        const remove = ref<HTMLButtonElement>(row, 'remove');
        remove.setAttribute('aria-label', fill(messages.removePerson, { number: index + 1 }));
        remove.disabled = state.people.length <= MIN_PEOPLE;
        return row;
      })
    );
    const full = state.people.length >= MAX_RENT_PEOPLE;
    addPersonButton.disabled = full;
    peopleLimit.hidden = !full;
    syncValues();
    syncPeopleText();
  }

  /** Names and the figure each field holds, which are only written when the structure or the mode changes */
  function syncValues(): void {
    Array.from(peopleList.children).forEach((row, index) => {
      const person = state.people[index];
      ref<HTMLInputElement>(row as HTMLElement, 'name').value = person.name;
      ref<HTMLInputElement>(row as HTMLElement, 'value').value = valueOf(state, person);
    });
  }

  /** The legend, the figure's label and its unit, which change without the fields being rebuilt */
  function syncPeopleText(): void {
    const label = state.mode === 'room' ? messages.area : messages.income;
    const unit = state.mode === 'room' ? UNIT_TEXT[state.unit] : state.currency;
    Array.from(peopleList.children).forEach((row, index) => {
      ref(row as HTMLElement, 'legend').textContent = personDefault(index + 1);
      ref(row as HTMLElement, 'valueLabel').textContent = label;
      ref(row as HTMLElement, 'unit').textContent = unit;
    });
  }

  function addPerson(): void {
    if (state.people.length >= MAX_RENT_PEOPLE) return;
    state.people.push(newPerson(pickName(namePool, state.people.map(person => person.name), personDefault)));
    personIds.push(nextId++);
    renderPeople();
    ref(peopleList.lastElementChild as HTMLElement, 'name').focus();
    refresh();
  }

  function removePerson(index: number): void {
    if (state.people.length <= MIN_PEOPLE) return;
    state.people.splice(index, 1);
    personIds.splice(index, 1);
    renderPeople();
    ref(peopleList.children[Math.min(index, state.people.length - 1)] as HTMLElement, 'name').focus();
    refresh();
  }

  // ----- errors and the result ---------------------------------------------------------------

  function describe(problem: RentProblem, module: Deferred): string {
    return fill(messages.errors[problem.code], {
      name: problem.name ?? '',
      currency: state.currency,
      places: problem.places ?? 0,
      max:
        problem.code === 'valueMax'
          ? count.format(problem.max ?? 0)
          : moneyOf(module).major(module.MAX_EXPENSE_AMOUNT, state.currency),
    });
  }

  /** Where a problem is shown: the message, and the field it describes */
  function placeOf(target: RentTarget): { message: HTMLElement; field: HTMLElement } | undefined {
    if (target.kind !== 'name' && target.kind !== 'value') {
      return { message: fieldError[target.kind], field: field[target.kind] };
    }
    const row = peopleList.children[target.person];
    if (!row) return undefined;
    return target.kind === 'name'
      ? { message: ref(row, 'nameError'), field: ref(row, 'name') }
      : { message: ref(row, 'valueError'), field: ref(row, 'value') };
  }

  function showProblems(problems: RentProblem[], module: Deferred): void {
    root.querySelectorAll<HTMLElement>('.sc-error').forEach(message => {
      message.hidden = true;
      message.textContent = '';
    });
    root.querySelectorAll('[aria-invalid], [aria-describedby]').forEach(element => {
      element.removeAttribute('aria-invalid');
      element.removeAttribute('aria-describedby');
    });
    for (const problem of problems) {
      if (!everythingVisited && !visited.has(keyOf(problem.target))) continue;
      const place = placeOf(problem.target);
      if (!place) continue;
      place.message.hidden = false;
      place.message.textContent = describe(problem, module);
      place.field.setAttribute('aria-describedby', place.message.id);
      place.field.setAttribute('aria-invalid', 'true');
    }
  }

  /** The status line is a polite live region: only touch it when its words change */
  function say(text: string): void {
    if (status.textContent !== text) status.textContent = text;
  }

  /** The app's own labels in bold, in the words the translation puts them in */
  function appStepNodes(figures: string): Node[] {
    return messages.appStep
      .split(/(\{\w+\})/)
      .filter(part => part !== '')
      .map(part => {
        if (part === '{how}' || part === '{percentage}') {
          const label = document.createElement('strong');
          label.textContent = part === '{how}' ? messages.appHow : messages.appPercentage;
          return label;
        }
        return document.createTextNode(part === '{list}' ? figures : part);
      });
  }

  function showResult(result: RentResult | undefined, money: Money): void {
    resultBox.hidden = !result;
    if (!result) {
      say(messages.resultWaiting);
      return;
    }
    const format = (minor: number) => money.minor(minor, result.currency);
    const withBills = result.billsMinor > 0;
    sharesList.replaceChildren(
      ...result.people.map(share => {
        const row = template('share');
        ref(row, 'name').textContent = personText(share.person);
        ref(row, 'whole').textContent = wholePercent.format(share.whole / 100);
        const amounts = [fill(messages.rentAmount, { amount: format(share.rentMinor) })];
        if (withBills) {
          amounts.push(
            fill(messages.billsAmount, { amount: format(share.billsMinor) }),
            fill(messages.totalAmount, { amount: format(share.rentMinor + share.billsMinor) })
          );
        }
        ref(row, 'amounts').textContent = amounts.join(' · ');
        ref(row, 'exact').textContent = fill(messages.shareExact, { percent: exactPercent.format(share.exact / 100) });
        return spaceOut(row);
      })
    );

    const zero = result.people.filter(share => share.whole === 0).map(share => personText(share.person));
    zeroNote.hidden = zero.length === 0;
    zeroNote.textContent = zero.length === 0 ? '' : fill(messages.zeroNote, { names: listOf.format(zero) });

    appStep.replaceChildren(
      ...appStepNodes(listOf.format(result.people.map(share => `${personText(share.person)} ${share.whole}`)))
    );
    appBills.hidden = !withBills;
    say(
      withBills
        ? fill(messages.summaryBills, { rent: format(result.rentMinor), bills: format(result.billsMinor) })
        : fill(messages.summary, { rent: format(result.rentMinor) })
    );
  }

  function show(module: Deferred): void {
    const { problems, result } = module.calculate(state);
    showProblems(problems, module);
    showResult(result, moneyOf(module));
  }

  /** Recompute now, or once the engine is here: changes made meanwhile are in `state` by then */
  let waiting = false;
  function refresh(): void {
    if (deferred.module) return show(deferred.module);
    if (waiting) return;
    waiting = true;
    deferred
      .fetch()
      // Offline, say: the waiting line stays, and the next change tries again
      .then(show, () => undefined)
      .finally(() => (waiting = false));
  }

  // ----- the share link -----------------------------------------------------------------------

  function copyLink(): void {
    const parts = { status: shareStatus, linkBox, linkInput };
    const copy = (module: Deferred) => module.copyShareLink(module.encodeRent(state), parts, messages);
    // Within the click when the codec is here, as some browsers allow the clipboard only then
    if (deferred.module) void copy(deferred.module);
    else deferred.fetch().then(copy, () => undefined);
  }

  // ----- events -------------------------------------------------------------------------------

  root.addEventListener('input', event => {
    const element = event.target;
    if (!(element instanceof HTMLInputElement)) return;
    const row = element.closest<HTMLElement>('.rc-person');
    const name = element.dataset.ref;
    if (row) {
      const person = state.people[Number(row.dataset.index)];
      if (name === 'name') person.name = element.value;
      else if (name === 'value') person[state.mode === 'room' ? 'area' : 'income'] = element.value;
      else return;
    } else if (name === 'rent' || name === 'bills' || name === 'shared') {
      state[name] = element.value;
    } else return;
    visit(element);
    refresh();
  });

  root.addEventListener('change', event => {
    const element = event.target;
    if (element === currencyBox) {
      state.currency = currencyBox.value;
      syncPeopleText();
      refresh();
    } else if (element === unitBox && (UNITS as readonly string[]).includes(unitBox.value)) {
      state.unit = unitBox.value as Unit;
      syncPeopleText();
      refresh();
    } else if (element instanceof HTMLInputElement && element.type === 'radio' && element.checked) {
      if (!(MODES as readonly string[]).includes(element.value) || element.value === state.mode) return;
      state.mode = element.value as Mode;
      // The other mode's figures start unvisited, so an empty field is not shouted at
      for (const key of [...visited]) if (key.startsWith('v')) visited.delete(key);
      syncMode();
      refresh();
    }
  });

  root.addEventListener('focusout', event => {
    if (event.target instanceof HTMLElement && visit(event.target)) refresh();
  });

  root.addEventListener('click', event => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-action]');
    if (!button || button.disabled) return;
    const index = Number(button.closest<HTMLElement>('.rc-person')?.dataset.index);
    switch (button.dataset.action) {
      case 'add-person':
        return addPerson();
      case 'remove-person':
        return removePerson(index);
      case 'copy-link':
        return copyLink();
    }
  });

  // The visitor's first touch fetches the engine, so it is usually here by the time it is needed
  const warm = () => void deferred.fetch().catch(() => undefined);
  root.addEventListener('focusin', warm, { once: true });
  root.addEventListener('pointerdown', warm, { once: true });

  // A link pasted into this page's own tab changes the hash without reloading it
  window.addEventListener('hashchange', () => {
    const changed = location.hash;
    if (!changed.startsWith(HASH_PREFIX)) return;
    deferred.fetch().then(
      module => {
        const opened = module.rentFromHash(changed, currencies);
        if (opened) load(opened, true);
      },
      () => undefined
    );
  });

  const begin = (opened: RentState | null): void => {
    load(opened ?? fresh(), opened !== null);
    root.removeAttribute('inert');
  };
  const hash = location.hash;
  if (!hash.startsWith(HASH_PREFIX)) begin(null);
  else {
    // Opened from a link: the form is built once, with its figures, as soon as the engine is here
    deferred.fetch().then(
      module => begin(module.rentFromHash(hash, currencies)),
      () => begin(null)
    );
  }
}

export function startRentCalculators(): void {
  document.querySelectorAll<HTMLElement>('[data-rent-calc]').forEach(start);
}

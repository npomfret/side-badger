/**
 * The split-bill calculator's page script (release 2, R3): the form, the live result and the share
 * link. It keeps the form in a `CalcState` (`split-engine.ts`), builds people, expenses and result
 * rows from the `<template>`s in `SplitCalculator.astro`, and recomputes with `calculate()` on
 * every change. Nothing is stored and nothing is requested: the only places the figures go are the
 * page and, when the visitor asks, the clipboard.
 *
 * Fields are rebuilt only when the structure changes (a person or an expense added or removed, a
 * link opened), never while someone types. An error shows once the visitor has been in its field,
 * but the result stays hidden while any error stands, whether it shows yet or not.
 */
import { MAX_EXPENSE_AMOUNT } from '../../lib/settle';
import { moneyFormatter } from '../content/money';
import {
  MAX_EXPENSES,
  MAX_PEOPLE,
  MIN_PEOPLE,
  calculate,
  newExpense,
  pickName,
  splitList,
  type CalcState,
  type Method,
  type Problem,
  type ProblemCode,
  type Target,
} from './split-engine';
import { HASH_PREFIX, encodeState, stateFromHash } from './split-fragment';

interface Messages {
  personLabel: string;
  removePerson: string;
  expenseLegend: string;
  removeExpense: string;
  defaultNames: string;
  defaultExpenseNames: string;
  shareAmount: string;
  sharePercent: string;
  copied: string;
  copyFailed: string;
  linkTooLarge: string;
  resultEmpty: string;
  resultWaiting: string;
  summary: string;
  summarySettled: string;
  transfer: string;
  errors: Record<ProblemCode, string>;
}

const METHODS: readonly string[] = ['equal', 'exact', 'percent'];

/** Fill `{placeholders}` in one pass, so a value that contains braces is never expanded again */
const fill = (template: string, params: Record<string, string | number>): string =>
  template.replace(/\{(\w+)\}/g, (_token, name: string) => String(params[name] ?? ''));

/** The element a script hook (`data-ref`) names inside `scope` */
function ref<T extends HTMLElement = HTMLElement>(scope: ParentNode, name: string): T {
  const element = scope.querySelector<T>(`[data-ref="${name}"]`);
  if (!element) throw new Error(`Split calculator: no element with data-ref="${name}"`);
  return element;
}

function start(root: HTMLElement): void {
  const messages = JSON.parse(ref(root, 'messages').textContent ?? '{}') as Messages;
  const money = moneyFormatter(root.dataset.intl ?? 'en');

  const currencyBox = ref<HTMLSelectElement>(root, 'currency');
  const currencies = Array.from(currencyBox.options, option => option.value);
  const peopleList = ref(root, 'people');
  const peopleLimit = ref(root, 'peopleLimit');
  const expensesBox = ref(root, 'expenses');
  const status = ref(root, 'status');
  const resultBox = ref(root, 'result');
  const balancesList = ref(root, 'balances');
  const paymentsBox = ref(root, 'payments-box');
  const paymentsList = ref(root, 'payments');
  const shareStatus = ref(root, 'shareStatus');
  const linkBox = ref(root, 'linkBox');
  const linkInput = ref<HTMLInputElement>(root, 'link');
  const action = (name: string) => root.querySelector<HTMLButtonElement>(`button[data-action="${name}"]`)!;
  const addPersonButton = action('add-person');
  const addExpenseButton = action('add-expense');

  const namePool = splitList(messages.defaultNames);
  const expensePool = splitList(messages.defaultExpenseNames);
  const personDefault = (number: number) => fill(messages.personLabel, { number });
  const expenseDefault = (number: number) => fill(messages.expenseLegend, { number });

  const template = (name: string): HTMLElement =>
    (root.querySelector<HTMLTemplateElement>(`template[data-template="${name}"]`)!.content
      .firstElementChild as HTMLElement).cloneNode(true) as HTMLElement;

  let state: CalcState;
  // Each person and expense gets an id that outlives its position, to say which fields were visited
  let nextId = 1;
  let personIds: number[] = [];
  let expenseIds: number[] = [];
  const visited = new Set<string>();
  let everythingVisited = false;

  // ----- state ----------------------------------------------------------------------------

  function fresh(): CalcState {
    const people: string[] = [];
    for (let n = 0; n < MIN_PEOPLE; n++) people.push(pickName(namePool, people, personDefault));
    return {
      currency: root.dataset.currency ?? currencies[0],
      people,
      expenses: [newExpense(pickName(expensePool, [], expenseDefault), people.length)],
    };
  }

  /** Replace the whole form: the first state, or one opened from a link */
  function load(next: CalcState, fromLink: boolean): void {
    state = next;
    currencyBox.value = next.currency;
    personIds = next.people.map(() => nextId++);
    expenseIds = next.expenses.map(() => nextId++);
    visited.clear();
    everythingVisited = fromLink;
    renderPeople();
    renderExpenses();
    refresh();
  }

  // ----- visited fields -----------------------------------------------------------------------

  const keyOf = (target: Target): string => {
    if (target.kind === 'person') return `p${personIds[target.person]}`;
    const expense = `e${expenseIds[target.expense]}`;
    return target.kind === 'share' ? `${expense}:s${personIds[target.person]}` : `${expense}:${target.field}`;
  };

  /** Record that the visitor has been in this field. Returns whether that was news. */
  function visit(element: HTMLElement): boolean {
    if (!(element instanceof HTMLInputElement || element instanceof HTMLSelectElement)) return false;
    const keys: string[] = [];
    const person = element.closest<HTMLElement>('.sc-person');
    const card = element.closest<HTMLElement>('.sc-expense');
    if (person) keys.push(`p${personIds[Number(person.dataset.index)]}`);
    else if (card) {
      const expense = `e${expenseIds[Number(card.dataset.index)]}`;
      const row = element.closest<HTMLElement>('.sc-share-row');
      if (row) keys.push(`${expense}:shares`, `${expense}:s${personIds[Number(row.dataset.person)]}`);
      else if (element.dataset.ref === 'payer' || element.dataset.ref === 'amount') keys.push(`${expense}:${element.dataset.ref}`);
    }
    const before = visited.size;
    keys.forEach(key => visited.add(key));
    return visited.size !== before;
  }

  // ----- people -------------------------------------------------------------------------------

  const personText = (person: number) => state.people[person].trim() || personDefault(person + 1);

  function renderPeople(): void {
    peopleList.replaceChildren(
      ...state.people.map((name, index) => {
        const row = template('person');
        const id = `sc-p${personIds[index]}`;
        row.dataset.index = String(index);
        const input = ref<HTMLInputElement>(row, 'name');
        const caption = ref<HTMLLabelElement>(row, 'caption');
        input.id = id;
        input.value = name;
        caption.htmlFor = id;
        caption.textContent = personDefault(index + 1);
        ref(row, 'error').id = `${id}-error`;
        const remove = ref<HTMLButtonElement>(row, 'remove');
        remove.setAttribute('aria-label', fill(messages.removePerson, { number: index + 1 }));
        remove.disabled = state.people.length <= MIN_PEOPLE;
        return row;
      })
    );
    const full = state.people.length >= MAX_PEOPLE;
    addPersonButton.disabled = full;
    peopleLimit.hidden = !full;
  }

  function addPerson(): void {
    if (state.people.length >= MAX_PEOPLE) return;
    state.people.push(pickName(namePool, state.people, personDefault));
    personIds.push(nextId++);
    for (const expense of state.expenses) {
      // Someone who joins a split among everyone is in it; an exact or percentage split is left alone
      expense.include.push(expense.method === 'equal' && expense.include.every(Boolean));
      expense.values.push('');
    }
    renderPeople();
    renderExpenses();
    ref(peopleList.lastElementChild as HTMLElement, 'name').focus();
    refresh();
  }

  function removePerson(index: number): void {
    if (state.people.length <= MIN_PEOPLE) return;
    state.people.splice(index, 1);
    personIds.splice(index, 1);
    state.expenses.forEach((expense, at) => {
      expense.include.splice(index, 1);
      expense.values.splice(index, 1);
      if (expense.payer === index) {
        // The person who paid has gone: say so, rather than leaving a blank field and no result
        expense.payer = -1;
        visited.add(`e${expenseIds[at]}:payer`);
      } else if (expense.payer > index) expense.payer--;
    });
    renderPeople();
    renderExpenses();
    ref(peopleList.children[Math.min(index, state.people.length - 1)] as HTMLElement, 'name').focus();
    refresh();
  }

  // ----- expenses -----------------------------------------------------------------------------

  function renderExpense(index: number): HTMLElement {
    const expense = state.expenses[index];
    const card = template('expense');
    const id = `sc-e${expenseIds[index]}`;
    card.dataset.index = String(index);
    ref(card, 'legend').textContent = expenseDefault(index + 1);

    const field = <T extends HTMLElement>(name: string, labelName: string): T => {
      const element = ref<T>(card, name);
      element.id = `${id}-${name}`;
      ref<HTMLLabelElement>(card, labelName).htmlFor = element.id;
      return element;
    };
    field<HTMLInputElement>('label', 'labelLabel').value = expense.label;
    const payer = field<HTMLSelectElement>('payer', 'payerLabel');
    state.people.forEach((_name, person) => payer.add(new Option('', String(person))));
    payer.value = String(expense.payer);
    field<HTMLInputElement>('amount', 'amountLabel').value = expense.amount;
    field<HTMLSelectElement>('method', 'methodLabel').value = expense.method;
    for (const name of ['payerError', 'amountError', 'sharesError']) ref(card, name).id = `${id}-${name}`;

    ref(card, 'shares').append(
      ...state.people.map((_name, person) => {
        const row = template('share');
        const rowId = `${id}-s${personIds[person]}`;
        row.dataset.person = String(person);
        const include = ref<HTMLInputElement>(row, 'include');
        include.id = `${rowId}-include`;
        include.checked = expense.include[person];
        ref<HTMLLabelElement>(row, 'includeLabel').htmlFor = include.id;
        const value = ref<HTMLInputElement>(row, 'value');
        value.id = `${rowId}-value`;
        value.value = expense.values[person];
        ref<HTMLLabelElement>(row, 'valueLabel').htmlFor = value.id;
        ref(row, 'error').id = `${rowId}-error`;
        return row;
      })
    );
    ref(card, 'remove').setAttribute('aria-label', fill(messages.removeExpense, { number: index + 1 }));
    return card;
  }

  function renderExpenses(): void {
    expensesBox.replaceChildren(...state.expenses.map((_expense, index) => renderExpense(index)));
    addExpenseButton.disabled = state.expenses.length >= MAX_EXPENSES;
    syncText();
  }

  /** Names, units and the method's labels, which change without the fields being rebuilt */
  function syncText(): void {
    expensesBox.querySelectorAll<HTMLElement>('.sc-expense').forEach((card, index) => {
      const expense = state.expenses[index];
      card.dataset.method = expense.method;
      const payer = ref<HTMLSelectElement>(card, 'payer');
      state.people.forEach((_name, person) => (payer.options[person + 1].text = personText(person)));
      const label = expense.method === 'percent' ? messages.sharePercent : messages.shareAmount;
      Array.from(ref(card, 'shares').children).forEach((row, person) => {
        ref(row as HTMLElement, 'includeLabel').textContent = personText(person);
        ref(row as HTMLElement, 'valueLabel').textContent = fill(label, { name: personText(person) });
        ref(row as HTMLElement, 'unit').textContent = expense.method === 'percent' ? '%' : state.currency;
        ref<HTMLInputElement>(row as HTMLElement, 'value').disabled = !expense.include[person];
      });
    });
  }

  function addExpense(): void {
    if (state.expenses.length >= MAX_EXPENSES) return;
    const label = pickName(expensePool, state.expenses.map(expense => expense.label), expenseDefault);
    state.expenses.push(newExpense(label, state.people.length));
    expenseIds.push(nextId++);
    renderExpenses();
    ref(expensesBox.lastElementChild as HTMLElement, 'label').focus();
    refresh();
  }

  function removeExpense(index: number): void {
    state.expenses.splice(index, 1);
    expenseIds.splice(index, 1);
    renderExpenses();
    addExpenseButton.focus();
    refresh();
  }

  // ----- errors and the result ---------------------------------------------------------------

  function describe(problem: Problem): string {
    const { currency } = state;
    return fill(messages.errors[problem.code], {
      name: problem.name ?? '',
      currency,
      places: problem.places ?? 0,
      max: money.major(MAX_EXPENSE_AMOUNT, currency),
      sum: problem.code === 'exactTotal' ? money.minor(problem.sum ?? 0, currency) : (problem.sum ?? 0),
      total: money.minor(problem.total ?? 0, currency),
    });
  }

  /** Where a problem is shown: the message, the field it describes, and whether that field can be marked invalid */
  function placeOf(target: Target): { message: HTMLElement; field: HTMLElement; invalid: boolean } | undefined {
    if (target.kind === 'person') {
      const row = peopleList.children[target.person];
      return row && { message: ref(row, 'error'), field: ref(row, 'name'), invalid: true };
    }
    const card = expensesBox.children[target.expense];
    if (!card) return undefined;
    if (target.kind === 'share') {
      const row = ref(card, 'shares').children[target.person];
      return row && { message: ref(row, 'error'), field: ref(row, 'value'), invalid: true };
    }
    if (target.field === 'shares') return { message: ref(card, 'sharesError'), field: ref(card, 'sharesBox'), invalid: false };
    return { message: ref(card, `${target.field}Error`), field: ref(card, target.field), invalid: true };
  }

  function showProblems(problems: Problem[]): void {
    root.querySelectorAll<HTMLElement>('.sc-error').forEach(message => {
      message.hidden = true;
      message.textContent = '';
    });
    root.querySelectorAll('[aria-invalid], [aria-describedby]').forEach(field => {
      field.removeAttribute('aria-invalid');
      field.removeAttribute('aria-describedby');
    });
    for (const problem of problems) {
      if (!everythingVisited && !visited.has(keyOf(problem.target))) continue;
      const place = placeOf(problem.target);
      if (!place) continue;
      place.message.hidden = false;
      place.message.textContent = describe(problem);
      place.field.setAttribute('aria-describedby', place.message.id);
      if (place.invalid) place.field.setAttribute('aria-invalid', 'true');
    }
  }

  /** The status line is a polite live region: only touch it when its words change */
  function say(text: string): void {
    if (status.textContent !== text) status.textContent = text;
  }

  function showResult(problems: Problem[], result: ReturnType<typeof calculate>['result']): void {
    resultBox.hidden = !result;
    if (!result) {
      say(state.expenses.length === 0 && problems.length === 0 ? messages.resultEmpty : messages.resultWaiting);
      return;
    }
    const format = (minor: number) => money.minor(minor, result.currency);
    balancesList.replaceChildren(
      ...result.balances.map(balance => {
        const row = template('balance');
        ref(row, 'name').textContent = personText(balance.person);
        ref(row, 'amount').textContent = money.minor(balance.minor, result.currency, { signed: true });
        return row;
      })
    );
    paymentsBox.hidden = result.payments.length === 0;
    paymentsList.replaceChildren(
      ...result.payments.map(payment => {
        const row = template('payment');
        row.textContent = fill(messages.transfer, {
          from: personText(payment.from),
          to: personText(payment.to),
          amount: format(payment.minor),
        });
        return row;
      })
    );
    say(
      result.payments.length === 0
        ? fill(messages.summarySettled, { total: format(result.totalMinor) })
        : fill(messages.summary, { count: result.payments.length, total: format(result.totalMinor) })
    );
  }

  function refresh(): void {
    const { problems, result } = calculate(state);
    showProblems(problems);
    showResult(problems, result);
  }

  // ----- the share link -----------------------------------------------------------------------

  async function copyLink(): Promise<void> {
    const payload = encodeState(state);
    linkBox.hidden = true;
    if (payload === null) {
      shareStatus.textContent = messages.linkTooLarge;
      return;
    }
    // The address bar gets the same link, so a reload or a bookmark keeps the figures
    history.replaceState(null, '', `${HASH_PREFIX}${payload}`);
    const url = `${location.origin}${location.pathname}${location.search}${HASH_PREFIX}${payload}`;
    try {
      await navigator.clipboard.writeText(url);
      shareStatus.textContent = messages.copied;
    } catch {
      // No clipboard permission, or an insecure page: show the link to copy by hand
      shareStatus.textContent = messages.copyFailed;
      linkInput.value = url;
      linkBox.hidden = false;
      linkInput.focus();
      linkInput.select();
    }
  }

  // ----- events -------------------------------------------------------------------------------

  root.addEventListener('input', event => {
    const element = event.target;
    if (!(element instanceof HTMLInputElement)) return;
    const person = element.closest<HTMLElement>('.sc-person');
    if (person) {
      state.people[Number(person.dataset.index)] = element.value;
      visit(element);
      syncText();
      refresh();
      return;
    }
    const card = element.closest<HTMLElement>('.sc-expense');
    if (!card) return;
    const expense = state.expenses[Number(card.dataset.index)];
    const row = element.closest<HTMLElement>('.sc-share-row');
    if (row && element.dataset.ref === 'value') expense.values[Number(row.dataset.person)] = element.value;
    else if (element.dataset.ref === 'amount') expense.amount = element.value;
    else if (element.dataset.ref === 'label') expense.label = element.value;
    else return;
    visit(element);
    refresh();
  });

  root.addEventListener('change', event => {
    const element = event.target;
    if (element === currencyBox) {
      state.currency = currencyBox.value;
      syncText();
      refresh();
      return;
    }
    if (!(element instanceof HTMLInputElement || element instanceof HTMLSelectElement)) return;
    const card = element.closest<HTMLElement>('.sc-expense');
    if (!card) return;
    const expense = state.expenses[Number(card.dataset.index)];
    if (element.dataset.ref === 'payer') expense.payer = Number(element.value);
    else if (element.dataset.ref === 'method' && METHODS.includes(element.value)) expense.method = element.value as Method;
    else if (element.dataset.ref === 'include' && element instanceof HTMLInputElement) {
      expense.include[Number(element.closest<HTMLElement>('.sc-share-row')?.dataset.person)] = element.checked;
    } else return;
    visit(element);
    syncText();
    refresh();
  });

  root.addEventListener('focusout', event => {
    if (event.target instanceof HTMLElement && visit(event.target)) refresh();
  });

  root.addEventListener('click', event => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-action]');
    if (!button || button.disabled) return;
    const index = Number(button.closest<HTMLElement>('.sc-person, .sc-expense')?.dataset.index);
    switch (button.dataset.action) {
      case 'add-person':
        return addPerson();
      case 'remove-person':
        return removePerson(index);
      case 'add-expense':
        return addExpense();
      case 'remove-expense':
        return removeExpense(index);
      case 'copy-link':
        return void copyLink();
    }
  });

  // A link pasted into this page's own tab changes the hash without reloading it
  window.addEventListener('hashchange', () => {
    const opened = stateFromHash(location.hash, currencies);
    if (opened) load(opened, true);
  });

  const opened = stateFromHash(location.hash, currencies);
  load(opened ?? fresh(), opened !== null);
  root.removeAttribute('inert');
}

export function startSplitCalculators(): void {
  document.querySelectorAll<HTMLElement>('[data-split-calc]').forEach(start);
}

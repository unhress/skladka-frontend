import { BankTransactionResponse, ExpenseResponse, GroupResponse, SourceResponse } from './models';

/** Absolute tolerance for hand-entered amounts (dropped kopecks, rounding to the nearest 5–10). */
const AMOUNT_TOLERANCE_ABS = 5;
/** Relative tolerance for bigger receipts rounded by hand (e.g. 1 959,40 → 2 000). */
const AMOUNT_TOLERANCE_REL = 0.02;

export interface DuplicateMatch {
  group: GroupResponse;
  expense: ExpenseResponse;
  /** True when both sides have a source and it is the same one; otherwise only date and amount matched. */
  sameSource: boolean;
}

function normalize(text: string): string {
  return ` ${text
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/['’`ʼ"«»]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()} `;
}

/** Merchant text as a lookup key: case, punctuation and spacing don't matter. */
export function merchantKey(description: string): string {
  return normalize(description).trim();
}

/**
 * Sources the user already picked for merchants: bank text of each imported line → source of the
 * expense it became (latest import wins; if the expense was edited later, its current source counts).
 */
export function learnSources(
  imported: BankTransactionResponse[],
  expenses: ExpenseResponse[],
): Map<string, string> {
  const byId = new Map(expenses.map(e => [e.id, e]));
  const learned = new Map<string, string>();
  const ordered = [...imported].sort((a, b) => a.occurredUtc.localeCompare(b.occurredUtc));
  for (const t of ordered) {
    const sourceId = t.importedExpenseId ? byId.get(t.importedExpenseId)?.sourceId : null;
    if (sourceId) {
      learned.set(merchantKey(t.description), sourceId);
    }
  }
  return learned;
}

/** Source to preselect for a bank line: what the user chose for this merchant before, else a name match. */
export function suggestSource(
  t: BankTransactionResponse,
  sources: SourceResponse[],
  learned: Map<string, string>,
): SourceResponse | null {
  const learnedId = learned.get(merchantKey(t.description));
  const remembered = learnedId ? sources.find(s => s.id === learnedId) : undefined;
  return remembered ?? inferSource(t.description, sources);
}

/** Best catalog/personal source whose name or slug appears in the bank's description, if any. */
export function inferSource(description: string, sources: SourceResponse[]): SourceResponse | null {
  const text = normalize(description);
  let best: SourceResponse | null = null;
  let bestLength = 0;
  for (const source of sources) {
    for (const key of [normalize(source.name), normalize(source.slug.replace(/-/g, ' '))]) {
      const length = key.trim().length;
      if (length >= 2 && text.includes(key) && length > bestLength) {
        best = source;
        bestLength = length;
      }
    }
  }
  return best;
}

/** Calendar day of the transaction in the user's own time zone (time of day is ignored). */
export function localDay(occurredUtc: string): string {
  const date = new Date(occurredUtc);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

export function amountsClose(a: number, b: number): boolean {
  const tolerance = Math.max(AMOUNT_TOLERANCE_ABS, Math.max(a, b) * AMOUNT_TOLERANCE_REL);
  return Math.abs(a - b) <= tolerance;
}

/**
 * Expenses already in the user's groups that look like this bank line: same day, close amount and,
 * when both sides know their source, the same source.
 */
export function findDuplicates(
  t: BankTransactionResponse,
  groups: GroupResponse[],
  expensesByGroup: Record<string, ExpenseResponse[]>,
  sources: SourceResponse[],
  learned: Map<string, string> = new Map(),
): DuplicateMatch[] {
  if (t.amount >= 0) {
    return [];
  }
  const day = localDay(t.occurredUtc);
  const amount = Math.abs(t.amount);
  const txSource = suggestSource(t, sources, learned);
  const matches: DuplicateMatch[] = [];
  for (const group of groups) {
    if (group.currencyCode.toUpperCase() !== t.currencyCode.toUpperCase()) {
      continue;
    }
    for (const expense of expensesByGroup[group.id] ?? []) {
      if (expense.occurredOn.slice(0, 10) !== day || !amountsClose(expense.amount, amount)) {
        continue;
      }
      const bothKnown = !!txSource && !!expense.sourceId;
      if (bothKnown && expense.sourceId !== txSource!.id) {
        continue;
      }
      matches.push({ group, expense, sameSource: bothKnown });
    }
  }
  return matches.sort((a, b) => Number(b.sameSource) - Number(a.sameSource));
}

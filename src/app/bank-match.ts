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
): DuplicateMatch[] {
  if (t.amount >= 0) {
    return [];
  }
  const day = localDay(t.occurredUtc);
  const amount = Math.abs(t.amount);
  const txSource = inferSource(t.description, sources);
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

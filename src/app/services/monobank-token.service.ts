import { Injectable } from '@angular/core';

const API = 'https://api.monobank.ua';
const MAX_PERIOD_SECONDS = 31 * 86400 + 3600;
const PAGE_SIZE = 500;
const COOLDOWN_MS = 61000;
const STORAGE_KEY = 'skladka.monobankToken';

const CURRENCIES: Record<number, string> = { 980: 'UAH', 840: 'USD', 978: 'EUR', 985: 'PLN', 826: 'GBP', 203: 'CZK', 756: 'CHF' };

export interface TokenAccount {
  id: string;
  title: string;
  currencyCode: string;
  balance: number;
}

export interface TokenLine {
  id: string;
  time: string;
  amount: number;
  currencyCode: string;
  description: string;
  mcc: number | null;
  receiptId: string | null;
  hold: boolean;
}

export interface FetchProgress {
  chunk: number;
  chunks: number;
  waitSeconds: number;
}

interface ClientInfo {
  accounts?: { id: string; type?: string; maskedPan?: string[]; currencyCode: number; balance: number }[];
}

interface StatementItem {
  id: string;
  time: number;
  description?: string;
  comment?: string;
  mcc?: number;
  originalMcc?: number;
  hold?: boolean;
  amount: number;
  currencyCode: number;
  receiptId?: string;
}

export class MonobankError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

/** Talks to monobank straight from the browser with the user's personal token; the token never reaches our server. */
@Injectable({ providedIn: 'root' })
export class MonobankTokenService {
  savedToken(): string {
    return localStorage.getItem(STORAGE_KEY) ?? '';
  }

  saveToken(token: string): void {
    localStorage.setItem(STORAGE_KEY, token);
  }

  forgetToken(): void {
    localStorage.removeItem(STORAGE_KEY);
  }

  async accounts(token: string): Promise<TokenAccount[]> {
    const info = await this.get<ClientInfo>(token, '/personal/client-info');
    return (info.accounts ?? []).map(a => ({
      id: a.id,
      title: `${a.type ?? 'card'}${a.maskedPan?.length ? ' ····' + a.maskedPan[0].slice(-4) : ''}`,
      currencyCode: CURRENCIES[a.currencyCode] ?? String(a.currencyCode),
      balance: a.balance / 100,
    }));
  }

  /** Fetches the period in bank-sized windows, yielding each batch so the caller can save progress as it goes. */
  async fetchStatement(
    token: string,
    accountId: string,
    from: Date,
    to: Date,
    onBatch: (lines: TokenLine[]) => Promise<void>,
    onProgress: (progress: FetchProgress) => void,
    cancelled: () => boolean,
  ): Promise<boolean> {
    const start = Math.floor(from.getTime() / 1000);
    const end = Math.min(Math.floor(to.getTime() / 1000), Math.floor(Date.now() / 1000));
    const chunks = Math.max(1, Math.ceil((end - start) / MAX_PERIOD_SECONDS));
    let first = true;

    for (let chunk = 0; chunk < chunks; chunk++) {
      const chunkStart = start + chunk * MAX_PERIOD_SECONDS;
      let windowEnd = Math.min(chunkStart + MAX_PERIOD_SECONDS, end);

      while (true) {
        if (cancelled()) {
          return false;
        }
        if (!first) {
          await this.cooldown(chunk + 1, chunks, onProgress, cancelled);
          if (cancelled()) {
            return false;
          }
        }
        first = false;

        const items = await this.get<StatementItem[]>(token, `/personal/statement/${encodeURIComponent(accountId)}/${chunkStart}/${windowEnd}`);
        await onBatch(items.map(i => this.toLine(i)));

        if (items.length < PAGE_SIZE) {
          break;
        }
        const oldest = Math.min(...items.map(i => i.time));
        if (oldest <= chunkStart || oldest >= windowEnd) {
          break;
        }
        windowEnd = oldest;
      }
    }

    return true;
  }

  private toLine(item: StatementItem): TokenLine {
    const text = (item.description ?? '').trim();
    const comment = (item.comment ?? '').trim();
    return {
      id: item.id,
      time: new Date(item.time * 1000).toISOString(),
      amount: item.amount / 100,
      currencyCode: CURRENCIES[item.currencyCode] ?? String(item.currencyCode),
      description: (comment ? `${text} — ${comment}` : text).slice(0, 1000),
      mcc: item.originalMcc ?? item.mcc ?? null,
      receiptId: item.receiptId ?? null,
      hold: !!item.hold,
    };
  }

  private async cooldown(chunk: number, chunks: number, onProgress: (p: FetchProgress) => void, cancelled: () => boolean): Promise<void> {
    const until = Date.now() + COOLDOWN_MS;
    while (Date.now() < until && !cancelled()) {
      onProgress({ chunk, chunks, waitSeconds: Math.ceil((until - Date.now()) / 1000) });
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  private async get<T>(token: string, path: string): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      let response: Response;
      try {
        response = await fetch(API + path, { headers: { 'X-Token': token } });
      } catch {
        throw new MonobankError('network', 0);
      }

      if (response.status === 429 && attempt < 2) {
        await new Promise(resolve => setTimeout(resolve, COOLDOWN_MS));
        continue;
      }
      if (!response.ok) {
        throw new MonobankError(response.status === 403 ? 'invalid-token' : response.status === 429 ? 'rate-limited' : 'http', response.status);
      }
      return (await response.json()) as T;
    }
  }
}

import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ThemeSwitcher } from '../../components/theme-switcher';
import { GlassSelect, SelectOption } from '../../components/glass-select';
import { SourcePicker } from '../../components/source-picker';
import { BankService } from '../../services/bank.service';
import { MonobankError, MonobankTokenService, TokenAccount } from '../../services/monobank-token.service';
import { ExpensesService } from '../../services/expenses.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { BankAccountResponse, BankConnectionResponse, BankTransactionResponse, ExpenseResponse, GroupResponse, SourceResponse } from '../../models';
import { DuplicateMatch, findDuplicates, learnSources, suggestSource } from '../../bank-match';
import { httpError } from '../../format';

const CARD_TITLES_KEY = 'skladka.bankCardTitles';
const PAGE = 30;

type Tab ='New' | 'Imported' | 'Ignored';

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function isoDate(date: Date): string {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

@Component({
  selector: 'app-bank',
  imports: [ThemeSwitcher, FormsModule, RouterLink, GlassSelect, SourcePicker, TranslatePipe],
  template: `
    <div class="app">
      <header class="topbar">
        <div class="topbar-left">
          <a class="icon-btn" routerLink="/" [attr.aria-label]="'nav.back' | translate">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </a>
          <div class="title-strong">{{ 'bank.title' | translate }}</div>
        </div>
        <app-theme-switcher />
      </header>

      @if (loading()) {
        <div class="loading"><div class="spinner"></div></div>
      } @else {
        <section>
          <div class="section-head"><span class="section-title">{{ 'bank.tokenTitle' | translate }}</span></div>
          <div class="card card-pad form-col">
            <div class="row-sub">{{ 'bank.tokenHint' | translate }}</div>
            <div style="position:relative">
              <input class="input" [type]="showToken() ? 'text' : 'password'" name="monoToken" autocomplete="off" spellcheck="false" [(ngModel)]="token" [placeholder]="'bank.tokenPlaceholder' | translate" [disabled]="tokenBusy()" style="width:100%;padding-right:84px;box-sizing:border-box" />
              <button class="icon-btn" type="button" (click)="copyToken()" [disabled]="!token.trim()" [attr.aria-label]="'bank.copyToken' | translate" style="position:absolute;right:40px;top:50%;transform:translateY(-50%);width:36px;height:36px;border:0;background:transparent">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              </button>
              <button class="icon-btn" type="button" (click)="showToken.set(!showToken())" [attr.aria-label]="(showToken() ? 'bank.hideToken' : 'bank.showToken') | translate" [attr.aria-pressed]="showToken()" style="position:absolute;right:4px;top:50%;transform:translateY(-50%);width:36px;height:36px;border:0;background:transparent">
                @if (showToken()) {
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><path d="M1 1l22 22"/></svg>
                } @else {
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                }
              </button>
            </div>
            <label class="row-sub" style="display:flex;align-items:center;gap:8px">
              <input type="checkbox" name="rememberToken" [(ngModel)]="rememberToken" />
              {{ 'bank.tokenRemember' | translate }}
            </label>
            <button class="btn btn-primary" type="button" (click)="loadTokenAccounts()" [disabled]="tokenBusy() || !token.trim()">
              @if (tokenBusy() && tokenAccounts().length === 0) { <span class="btn-spin"></span> } {{ 'bank.tokenAccounts' | translate }}
            </button>
            @if (tokenAccounts().length > 0) {
              <app-glass-select [(value)]="tokenAccountId" [options]="tokenAccountOptions()" [ariaLabel]="'bank.account' | translate" />
              <div class="form-row">
                <input class="input" type="date" name="tokenFrom" [(ngModel)]="from" [attr.aria-label]="'bank.from' | translate" [disabled]="tokenBusy()" />
                <input class="input" type="date" name="tokenTo" [(ngModel)]="to" [attr.aria-label]="'bank.to' | translate" [disabled]="tokenBusy()" />
              </div>
              <div class="row-sub">{{ 'bank.tokenEstimate' | translate:{ minutes: estimateMinutes() } }}</div>
              @if (!tokenBusy()) {
                <button class="btn btn-primary" type="button" (click)="importWithToken()" [disabled]="!tokenAccountId || !from || !to">{{ 'bank.import' | translate }}</button>
              } @else {
                <button class="btn btn-ghost" type="button" (click)="cancelToken = true">{{ 'common.cancel' | translate }}</button>
              }
            }
            @if (tokenStatus()) { <div class="row-sub">{{ tokenStatus() }}</div> }
          </div>
        </section>

        <section>
          <div class="card card-pad form-col">
            @if (!connection()) {
              <div class="row-title">{{ 'bank.connectTitle' | translate }}</div>
              <div class="row-sub">{{ 'bank.connectHint' | translate }}</div>
              <button class="btn btn-primary" type="button" (click)="connect()" [disabled]="busy()">
                @if (busy()) { <span class="btn-spin"></span> } {{ 'bank.connect' | translate }}
              </button>
            } @else if (connection()!.status === 'Pending') {
              <div class="row-title">{{ 'bank.pendingTitle' | translate }}</div>
              <div class="row-sub">{{ 'bank.pendingHint' | translate }}</div>
              @if (connection()!.acceptUrl) {
                <a class="btn btn-ghost" [href]="connection()!.acceptUrl" target="_blank" rel="noopener noreferrer">{{ 'bank.openMonobank' | translate }}</a>
              }
              <div style="display:flex;gap:8px">
                <button class="btn btn-primary" type="button" (click)="refresh()" [disabled]="busy()">{{ 'bank.checkConfirmed' | translate }}</button>
                <button class="btn btn-ghost" type="button" (click)="disconnect()" [disabled]="busy()">{{ 'common.cancel' | translate }}</button>
              </div>
            } @else {
              <div style="display:flex;align-items:center;gap:10px">
                <div class="row-main">
                  <div class="row-title">monobank</div>
                  <div class="row-sub">{{ 'bank.connected' | translate }}</div>
                </div>
                <button class="btn btn-ghost btn-sm" type="button" (click)="disconnect()" [disabled]="busy()">{{ 'bank.disconnect' | translate }}</button>
              </div>
            }
          </div>
        </section>

        @if (connection()?.status === 'Active') {
          <section>
            <div class="section-head"><span class="section-title">{{ 'bank.importTitle' | translate }}</span></div>
            <div class="card card-pad form-col">
              <app-glass-select [(value)]="accountId" [options]="accountOptions()" [ariaLabel]="'bank.account' | translate" />
              <div class="form-row">
                <input class="input" type="date" name="from" [(ngModel)]="from" [attr.aria-label]="'bank.from' | translate" />
                <input class="input" type="date" name="to" [(ngModel)]="to" [attr.aria-label]="'bank.to' | translate" />
              </div>
              <button class="btn btn-primary" type="button" (click)="importStatement()" [disabled]="busy() || !accountId || !from || !to">
                @if (busy()) { <span class="btn-spin"></span> } {{ 'bank.import' | translate }}
              </button>
              @if (importNote()) { <div class="row-sub">{{ importNote() }}</div> }
            </div>
          </section>
        }

          <section>
            <div class="form-row" style="margin-bottom:10px">
              @for (t of tabs; track t) {
                <button class="btn btn-sm" [class.btn-primary]="tab() === t" [class.btn-ghost]="tab() !== t" type="button" (click)="setTab(t)">{{ 'bank.tab' + t | translate }}</button>
              }
            </div>

            @if (tab() === 'Imported' && transactions().length > 0) {
              <div style="display:flex;justify-content:flex-end;margin:-2px 0 8px">
                <button class="btn btn-sm" [class.btn-primary]="selectMode()" [class.btn-ghost]="!selectMode()" type="button" (click)="toggleSelectMode()">{{ (selectMode() ? 'group.selectDone' : 'bank.selectToRemove') | translate }}</button>
              </div>
              @if (selectMode()) {
                <div style="position:sticky;top:8px;z-index:20;display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:10px 12px;margin-bottom:10px;border-radius:14px;background:var(--surface);border:1px solid var(--line-strong);box-shadow:var(--shadow-hero)">
                  <span class="row-title tnum" style="font-size:14px;flex:1;min-width:90px">{{ 'group.selectedCount' | translate:{ count: selected().size, total: transactions().length } }}</span>
                  <button class="btn btn-ghost btn-sm" type="button" (click)="selectCardAll()">{{ 'bank.selectCard' | translate }}</button>
                  <button class="btn btn-ghost btn-sm" type="button" (click)="selectEverything()">{{ 'group.selectAll' | translate }}</button>
                  <button class="btn btn-ghost btn-sm" type="button" (click)="selected.set(emptySet)" [disabled]="selected().size === 0">{{ 'group.selectNone' | translate }}</button>
                  <button class="btn btn-primary btn-sm" type="button" style="background:var(--neg)" (click)="deleteSelected()" [disabled]="busy() || selected().size === 0">
                    @if (busy()) { <span class="btn-spin"></span> {{ deleteProgress() }} } @else { {{ 'bank.removeFromGroups' | translate:{ count: selected().size } }} }
                  </button>
                </div>
                <div class="row-sub" style="margin:-4px 0 10px">{{ 'bank.removeHint' | translate }}</div>
              }
            }

            @if (listLoading()) {
              <div class="loading"><div class="spinner"></div></div>
            } @else if (transactions().length === 0) {
              <div class="card"><div class="empty">{{ 'bank.empty' | translate }}</div></div>
            } @else {
              @if (cardGroups().length > 1) {
                <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px">
                  @for (c of cardGroups(); track c.accountId) {
                    <button class="btn btn-sm" [class.btn-primary]="activeCard()?.accountId === c.accountId" [class.btn-ghost]="activeCard()?.accountId !== c.accountId" type="button" (click)="selectCard(c.accountId)">{{ c.label }} · {{ c.items.length }}</button>
                  }
                </div>
              }
              @if (activeCard(); as g) {
              <div class="section-head" style="margin-top:4px">
                <span class="section-title">{{ g.label }}</span>
                <span class="row-sub tnum">{{ g.items.length }}{{ g.spent > 0 ? ' · −' + g.spent.toFixed(2) + ' ' + g.currency : '' }}</span>
              </div>
              @if (tab() === 'New') {
                <button class="btn btn-ghost btn-sm" type="button" style="margin:0 0 8px" (click)="ignoreCard(g.accountId, g.label, g.items.length)" [disabled]="busy()">{{ 'bank.ignoreAll' | translate }}</button>
              }
              <div class="card rows">
                @for (t of g.items.slice(0, visibleCount()); track t.id) {
                  <div class="row" style="flex-wrap:wrap;row-gap:10px">
                    <div style="display:flex;align-items:center;gap:12px;flex-basis:100%;min-width:0" [style.cursor]="selectMode() ? 'pointer' : null" (click)="selectMode() && toggleRow(t, $event.shiftKey)">
                      @if (selectMode()) {
                        <input type="checkbox" [checked]="selected().has(t.id)" (click)="$event.stopPropagation()" (change)="toggleRow(t, $any($event).shiftKey === true)" style="flex:none;width:20px;height:20px" />
                      }
                      <div class="row-main">
                        <div class="row-title">{{ t.description }}</div>
                        <div class="row-sub">{{ date(t) }}</div>
                      </div>
                      <div class="row-title tnum" style="flex:none;overflow:visible" [style.color]="t.amount > 0 ? 'var(--pos)' : ''">{{ money(t) }}</div>
                    </div>
                    @if (t.status === 'New' && duplicates().get(t.id); as dups) {
                      <div class="row-sub" style="flex-basis:100%;color:var(--neg);margin-top:0">
                        ⚠ {{ 'bank.maybeDuplicate' | translate }}
                        @for (d of dups; track d.expense.id) {
                          <div>«{{ d.expense.description }}» · {{ d.expense.amount.toFixed(2) }} {{ d.group.currencyCode }} · {{ d.group.name }}</div>
                        }
                      </div>
                    }
                    <div style="display:flex;align-items:center;justify-content:flex-end;gap:6px;flex-basis:100%">
                      @if (t.status === 'New') {
                        @if (t.amount < 0) {
                          <button class="btn btn-primary btn-sm" type="button" (click)="openAdd(t)" [disabled]="busy()">{{ 'bank.addToGroup' | translate }}</button>
                        } @else {
                          <span class="row-sub">{{ 'bank.income' | translate }}</span>
                        }
                        <button class="btn btn-ghost btn-sm" type="button" (click)="ignore(t)" [disabled]="busy()">{{ 'bank.ignore' | translate }}</button>
                      } @else if (t.status === 'Ignored') {
                        <button class="btn btn-ghost btn-sm" type="button" (click)="restore(t)" [disabled]="busy()">{{ 'bank.restore' | translate }}</button>
                      } @else {
                        <span class="chip">{{ 'bank.inGroup' | translate }}</span>
                      }
                    </div>

                    @if (addTarget()?.id === t.id) {
                      <div class="form-col" style="flex-basis:100%;margin-top:8px">
                        @if (groupOptions().length === 0) {
                          <div class="row-sub">{{ 'bank.noGroups' | translate:{ currency: t.currencyCode } }}</div>
                        } @else {
                          <app-glass-select [value]="addGroupId()" (valueChange)="onGroupChange($event)" [options]="groupOptions()" [ariaLabel]="'bank.group' | translate" />
                          <app-glass-select [(value)]="addPayerId" [options]="payerOptions()" [ariaLabel]="'bank.payer' | translate" />
                          <app-source-picker [(value)]="addSourceId" [sources]="sources()" />
                          <input class="input" name="desc" [(ngModel)]="addDescription" [placeholder]="'bank.descriptionPlaceholder' | translate" maxlength="500" />
                          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;user-select:none">
                            <input type="checkbox" name="customSplit" [ngModel]="customSplit()" (ngModelChange)="toggleSplit($event)" />
                            <span class="row-title" style="font-size:14px">{{ 'group.customSplit' | translate }}</span>
                          </label>
                          @if (customSplit()) {
                            <div class="card rows">
                              @for (p of splitParticipants(); track p.id) {
                                <div class="row">
                                  <div class="row-main"><div class="row-title">{{ p.displayName }}</div></div>
                                  <div style="display:flex;align-items:center;gap:6px;color:var(--muted);font-size:13px">
                                    <input class="input" type="number" step="0.01" min="0" max="100" [name]="'bsp_' + p.id" [(ngModel)]="splitDraft[p.id]" (change)="rebalance(p.id, splitDraft[p.id])" style="height:36px;width:72px" /> %
                                  </div>
                                </div>
                              }
                            </div>
                            <div style="display:flex;align-items:center;justify-content:space-between;gap:10px">
                              <button class="btn btn-ghost btn-sm" type="button" (click)="splitEvenly()">{{ 'group.splitEvenly' | translate }}</button>
                              <span class="tnum" [style.color]="splitBalanced() ? 'var(--muted)' : 'var(--neg)'" style="font-size:13px;font-weight:600">{{ 'group.splitTotal' | translate:{ total: splitTotal() } }}</span>
                            </div>
                          }
                        }
                        <div style="display:flex;gap:8px;justify-content:flex-end">
                          <button class="btn btn-ghost btn-sm" type="button" (click)="addTarget.set(null)">{{ 'common.cancel' | translate }}</button>
                          <button class="btn btn-primary btn-sm" type="button" (click)="confirmAdd(t)" [disabled]="busy() || !addGroupId() || (customSplit() && !splitBalanced())">{{ 'bank.addReceipt' | translate }}</button>
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>
              @if (g.items.length > visibleCount()) {
                <button class="btn btn-ghost" type="button" style="width:100%;margin-top:10px" (click)="visibleCount.set(visibleCount() + PAGE)">{{ 'bank.showMore' | translate:{ shown: visibleCount(), total: g.items.length } }}</button>
              }
              }
            }
          </section>

        <div class="foot">{{ 'bank.foot' | translate }}</div>
      }
    </div>
  `,
})
export class Bank {
  private readonly bank = inject(BankService);
  private readonly api = inject(ExpensesService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);
  private readonly tokens = inject(MonobankTokenService);

  protected token = this.tokens.savedToken();
  protected rememberToken = !!this.token;
  protected cancelToken = false;
  protected tokenAccountId = '';
  protected readonly tokenBusy = signal(false);
  protected readonly tokenStatus = signal('');
  protected readonly showToken = signal(false);
  protected readonly tokenAccounts = signal<TokenAccount[]>([]);
  protected readonly tokenAccountOptions = computed<SelectOption[]>(() =>
    this.tokenAccounts().map(a => ({ value: a.id, label: `${a.title} · ${a.balance.toFixed(2)} ${a.currencyCode}` })));

  protected readonly tabs: Tab[] = ['New', 'Imported', 'Ignored'];
  protected readonly emptySet = new Set<string>();
  protected readonly selectMode = signal(false);
  protected readonly selected = signal<Set<string>>(this.emptySet);
  protected readonly deleteProgress = signal('');
  private lastToggled = '';
  protected readonly loading = signal(true);
  protected readonly listLoading = signal(false);
  protected readonly busy = signal(false);
  protected readonly connection = signal<BankConnectionResponse | null>(null);
  protected readonly accounts = signal<BankAccountResponse[]>([]);
  protected readonly transactions = signal<BankTransactionResponse[]>([]);
  protected readonly tab = signal<Tab>('New');
  protected readonly importNote = signal('');
  protected readonly groups = signal<GroupResponse[]>([]);
  protected readonly addTarget = signal<BankTransactionResponse | null>(null);
  protected readonly addGroupId = signal('');
  protected readonly sources = signal<SourceResponse[]>([]);
  private readonly expensesByGroup = signal<Record<string, ExpenseResponse[]>>({});
  /** Merchant text → source the user picked for it on earlier imports. */
  private readonly learned = computed(() =>
    learnSources(this.importedLines(), Object.values(this.expensesByGroup()).flat()));
  private readonly importedLines = signal<BankTransactionResponse[]>([]);
  protected readonly addSourceId = signal('');

  /** Bank lines that look like an expense already entered by hand (same day, close amount, same source). */
  protected readonly duplicates = computed(() => {
    const map = new Map<string, DuplicateMatch[]>();
    for (const t of this.transactions()) {
      const found = findDuplicates(t, this.groups(), this.expensesByGroup(), this.sources(), this.learned());
      if (found.length > 0) {
        map.set(t.id, found.slice(0, 3));
      }
    }
    return map;
  });

  private readonly cardTitles = signal<Record<string, string>>(this.loadCardTitles());

  /** The loaded list split by card, biggest spender first; cards without a known name show the tail of their id. */
  protected readonly cardGroups = computed(() => {
    const titles = this.cardTitles();
    const byCard = new Map<string, BankTransactionResponse[]>();
    for (const t of this.transactions()) {
      byCard.set(t.accountId, [...(byCard.get(t.accountId) ?? []), t]);
    }
    return [...byCard.entries()]
      .map(([accountId, items]) => ({
        accountId,
        items,
        label: items.find(t => t.accountTitle)?.accountTitle ?? titles[accountId] ?? `${this.translate.instant('bank.card')} ····${accountId.slice(-4)}`,
        currency: items[0].currencyCode,
        spent: round2(items.filter(t => t.amount < 0).reduce((sum, t) => sum - t.amount, 0)),
      }))
      .sort((a, b) => b.items.length - a.items.length || a.label.localeCompare(b.label, 'uk'));
  });

  protected readonly PAGE = PAGE;
  protected readonly visibleCount = signal(PAGE);
  private readonly selectedCard = signal('');

  protected readonly activeCard = computed(() => {
    const groups = this.cardGroups();
    return groups.find(g => g.accountId === this.selectedCard()) ?? groups[0] ?? null;
  });

  protected selectCard(accountId: string): void {
    this.selectedCard.set(accountId);
    this.visibleCount.set(PAGE);
    this.addTarget.set(null);
  }

  protected async copyToken(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.token.trim());
      this.toast.show(this.translate.instant('bank.tokenCopied'));
    } catch {
      this.toast.show(this.translate.instant('bank.tokenCopyFailed'), 'err');
    }
  }

  private loadCardTitles(): Record<string, string> {
    try {
      return JSON.parse(localStorage.getItem(CARD_TITLES_KEY) ?? '{}') as Record<string, string>;
    } catch {
      return {};
    }
  }

  /** Stores the names on the server so every device shows the same card names. */
  private async saveTitles(titles: { accountId: string; title: string }[]): Promise<void> {
    try {
      await this.bank.setAccountTitles(titles);
      if (this.transactions().some(t => !t.accountTitle)) {
        this.transactions.set(await this.bank.listTransactions(this.tab()));
      }
    } catch {
      // The local cache still names the cards on this device.
    }
  }

  private rememberCards(cards: { id: string; title: string }[]): void {
    const next = { ...this.cardTitles() };
    for (const card of cards) {
      next[card.id] = card.title;
    }
    this.cardTitles.set(next);
    localStorage.setItem(CARD_TITLES_KEY, JSON.stringify(next));
  }

  protected accountId = '';
  protected from = isoDate(new Date(Date.now() - 30 * 86400000));
  protected to = isoDate(new Date());
  protected addPayerId = '';
  protected addDescription = '';

  protected readonly accountOptions = computed<SelectOption[]>(() =>
    this.accounts().map(a => ({ value: a.accountId, label: `${a.title} · ${a.balance.toFixed(2)} ${a.currencyCode}` })));

  protected readonly groupOptions = computed<SelectOption[]>(() => {
    const target = this.addTarget();
    return this.groups()
      .filter(g => !target || g.currencyCode === target.currencyCode)
      .map(g => ({ value: g.id, label: g.name }));
  });

  protected readonly customSplit = signal(false);
  protected splitDraft: Record<string, number> = {};

  protected readonly splitParticipants = computed(() =>
    (this.groups().find(g => g.id === this.addGroupId())?.participants ?? []).filter(p => p.isActive));

  protected readonly payerOptions = computed<SelectOption[]>(() => {
    const group = this.groups().find(g => g.id === this.addGroupId());
    return (group?.participants ?? []).filter(p => p.isActive).map(p => ({ value: p.id, label: p.displayName }));
  });

  constructor() {
    void this.init();
  }

  private async init(): Promise<void> {
    try {
      const connections = await this.bank.listConnections();
      this.connection.set(connections.find(c => c.status === 'Active') ?? connections.find(c => c.status === 'Pending') ?? null);
      if (this.connection()?.status === 'Active') {
        await this.onActive();
      } else {
        await this.loadTransactions();
      }
    } catch (e) {
      this.toast.show(httpError(e), 'err');
    } finally {
      this.loading.set(false);
    }
  }

  private async onActive(): Promise<void> {
    const id = this.connection()!.id;
    const [accounts] = await Promise.all([this.bank.listAccounts(id), this.loadTransactions()]);
    this.accounts.set(accounts);
    this.rememberCards(accounts.map(a => ({ id: a.accountId, title: a.title })));
    void this.saveTitles(accounts.map(a => ({ accountId: a.accountId, title: a.title })));
    this.accountId = accounts[0]?.accountId ?? '';
  }

  private async loadTransactions(): Promise<void> {
    this.listLoading.set(true);
    try {
      this.transactions.set(await this.bank.listTransactions(this.tab()));
      void this.loadExistingExpenses();
    } catch (e) {
      this.toast.show(httpError(e), 'err');
    } finally {
      this.listLoading.set(false);
    }
  }

  /** Loads the user's groups, sources and expenses once, for duplicate warnings on new bank lines. */
  private existingLoaded = false;

  private async loadExistingExpenses(): Promise<void> {
    if (this.existingLoaded || this.tab() !== 'New' || !this.transactions().some(t => t.amount < 0)) {
      return;
    }
    this.existingLoaded = true;
    try {
      const [groups, sources, imported] = await Promise.all([
        this.groups().length > 0 ? Promise.resolve(this.groups()) : this.api.listGroups(),
        this.api.listSources(),
        this.bank.listTransactions('Imported'),
      ]);
      this.importedLines.set(imported);
      if (this.groups().length === 0) {
        this.groups.set(groups);
      }
      this.sources.set(sources);
      // Every group: expenses feed both duplicate hints and the sources learned from earlier imports.
      const relevant = groups;
      const lists = await Promise.all(relevant.map(g => this.api.listExpenses(g.id)));
      const byGroup: Record<string, ExpenseResponse[]> = {};
      relevant.forEach((g, i) => (byGroup[g.id] = lists[i]));
      this.expensesByGroup.set(byGroup);
    } catch {
      // Duplicate hints are best-effort; the list itself still works without them.
      this.existingLoaded = false;
    }
  }

  private async run(action: () => Promise<void>): Promise<void> {
    this.busy.set(true);
    try {
      await action();
    } catch (e) {
      this.toast.show(httpError(e), 'err');
    } finally {
      this.busy.set(false);
    }
  }

  protected connect(): Promise<void> {
    return this.run(async () => {
      const created = await this.bank.startConnection();
      this.connection.set(created);
      if (created.acceptUrl) {
        window.open(created.acceptUrl, '_blank', 'noopener,noreferrer');
      }
    });
  }

  protected refresh(): Promise<void> {
    return this.run(async () => {
      const updated = await this.bank.refreshConnection(this.connection()!.id);
      this.connection.set(updated);
      if (updated.status === 'Active') {
        await this.onActive();
      } else {
        this.toast.show(this.translate.instant('bank.notConfirmed'), 'err');
      }
    });
  }

  protected disconnect(): Promise<void> {
    return this.run(async () => {
      await this.bank.revokeConnection(this.connection()!.id);
      this.connection.set(null);
      this.accounts.set([]);
      this.transactions.set([]);
    });
  }

  protected importStatement(): Promise<void> {
    return this.run(async () => {
      const result = await this.bank.importStatement(this.connection()!.id, this.accountId, this.from, this.to);
      const key = result.complete ? 'bank.importDone' : 'bank.importPartial';
      this.importNote.set(this.translate.instant(key, { fetched: result.fetched, added: result.added }));
      this.tab.set('New');
      await this.loadTransactions();
    });
  }

  protected estimateMinutes(): number {
    const days = (new Date(this.to).getTime() - new Date(this.from).getTime()) / 86400000 + 1;
    return Math.max(0, Math.ceil(days / 31) - 1);
  }

  private tokenError(e: unknown): string {
    if (e instanceof MonobankError) {
      const key = e.message === 'invalid-token' ? 'bank.tokenInvalid' : e.message === 'rate-limited' ? 'bank.tokenRateLimited' : e.message === 'network' ? 'bank.tokenNetwork' : 'bank.tokenFailed';
      return this.translate.instant(key);
    }
    return httpError(e);
  }

  protected async loadTokenAccounts(): Promise<void> {
    const token = this.token.trim();
    this.tokenBusy.set(true);
    this.tokenStatus.set('');
    try {
      const accounts = await this.tokens.accounts(token);
      this.tokenAccounts.set(accounts);
      const titles = accounts.map(a => ({ accountId: a.id, title: `${a.title} ${a.currencyCode}` }));
      this.rememberCards(titles.map(t => ({ id: t.accountId, title: t.title })));
      void this.saveTitles(titles);
      this.tokenAccountId = accounts[0]?.id ?? '';
      if (this.rememberToken) {
        this.tokens.saveToken(token);
      } else {
        this.tokens.forgetToken();
      }
    } catch (e) {
      this.tokenAccounts.set([]);
      this.toast.show(this.tokenError(e), 'err');
    } finally {
      this.tokenBusy.set(false);
    }
  }

  protected async importWithToken(): Promise<void> {
    const account = this.tokenAccounts().find(a => a.id === this.tokenAccountId);
    if (!account) {
      return;
    }
    this.cancelToken = false;
    this.tokenBusy.set(true);
    let fetched = 0;
    let added = 0;
    let finished = false;
    try {
      finished = await this.tokens.fetchStatement(
        this.token.trim(),
        account.id,
        account.currencyCode,
        new Date(`${this.from}T00:00:00`),
        new Date(`${this.to}T23:59:59`),
        async lines => {
          if (lines.length === 0) {
            return;
          }
          const result = await this.bank.importLines(account.id, lines, `${account.title} ${account.currencyCode}`);
          fetched += result.fetched;
          added += result.added;
          this.tokenStatus.set(this.translate.instant('bank.importDone', { fetched, added }));
        },
        p => this.tokenStatus.set(this.translate.instant('bank.tokenWaiting', { chunk: p.chunk, chunks: p.chunks, seconds: p.waitSeconds })),
        () => this.cancelToken,
      );
    } catch (e) {
      this.toast.show(this.tokenError(e), 'err');
    } finally {
      this.tokenBusy.set(false);
    }
    const key = finished ? 'bank.importDone' : 'bank.tokenStopped';
    this.tokenStatus.set(this.translate.instant(key, { fetched, added }));
    this.tab.set('New');
    await this.loadTransactions();
  }

  protected ignoreCard(accountId: string, label: string, count: number): Promise<void> {
    if (!confirm(this.translate.instant('bank.confirmIgnoreAll', { card: label, count }))) {
      return Promise.resolve();
    }
    return this.run(async () => {
      const result = await this.bank.ignoreAccount(accountId);
      this.toast.show(this.translate.instant('bank.ignoredDone', { count: result.ignored }));
      await this.loadTransactions();
    });
  }

  protected toggleSelectMode(): void {
    this.selectMode.update(on => !on);
    this.selected.set(this.emptySet);
    this.lastToggled = '';
  }

  /** Lines in the order shown, so a Shift-click range follows what the user sees. */
  private orderedIds(): string[] {
    return this.cardGroups().flatMap(group => group.items.map(t => t.id));
  }

  protected toggleRow(t: BankTransactionResponse, range: boolean): void {
    const next = new Set(this.selected());
    const ids = this.orderedIds();
    const turnOn = !next.has(t.id);
    if (range && this.lastToggled && ids.includes(this.lastToggled)) {
      const from = ids.indexOf(this.lastToggled);
      const to = ids.indexOf(t.id);
      for (const id of ids.slice(Math.min(from, to), Math.max(from, to) + 1)) {
        if (turnOn) next.add(id); else next.delete(id);
      }
    } else if (turnOn) {
      next.add(t.id);
    } else {
      next.delete(t.id);
    }
    this.lastToggled = t.id;
    this.selected.set(next);
  }

  protected selectCardAll(): void {
    const card = this.activeCard();
    this.selected.set(new Set(card?.items.map(t => t.id) ?? []));
  }

  protected selectEverything(): void {
    this.selected.set(new Set(this.transactions().map(t => t.id)));
  }

  private async expenseGroupIndex(): Promise<Map<string, string>> {
    let groups = this.groups();
    if (groups.length === 0) {
      groups = await this.api.listGroups();
      this.groups.set(groups);
    }
    let byGroup = this.expensesByGroup();
    if (Object.keys(byGroup).length === 0) {
      const lists = await Promise.all(groups.map(g => this.api.listExpenses(g.id)));
      byGroup = {};
      groups.forEach((g, i) => (byGroup[g.id] = lists[i]));
      this.expensesByGroup.set(byGroup);
    }
    const index = new Map<string, string>();
    for (const [groupId, list] of Object.entries(byGroup)) {
      for (const expense of list) {
        index.set(expense.id, groupId);
      }
    }
    return index;
  }

  /** Deletes the receipts these bank lines became; the lines return to "New" by themselves. */
  protected async deleteSelected(): Promise<void> {
    const chosen = this.transactions().filter(t => this.selected().has(t.id) && t.importedExpenseId);
    if (chosen.length === 0) {
      return;
    }
    if (!confirm(this.translate.instant('bank.confirmRemove', { count: chosen.length }))) {
      return;
    }
    this.busy.set(true);
    let removed = 0;
    try {
      const index = await this.expenseGroupIndex();
      for (const t of chosen) {
        this.deleteProgress.set(`${removed + 1}/${chosen.length}`);
        const groupId = index.get(t.importedExpenseId!);
        if (groupId) {
          await this.api.deleteExpense(groupId, t.importedExpenseId!);
        }
        removed++;
      }
    } catch (e) {
      this.toast.show(httpError(e), 'err');
    } finally {
      this.busy.set(false);
      this.deleteProgress.set('');
    }
    if (removed > 0) {
      this.toast.show(this.translate.instant('bank.removedDone', { count: removed }));
      this.expensesByGroup.set({});
      this.existingLoaded = false;
    }
    this.selected.set(this.emptySet);
    await this.loadTransactions();
  }

  protected async setTab(tab: Tab): Promise<void> {
    this.selectMode.set(false);
    this.selected.set(this.emptySet);
    this.tab.set(tab);
    this.addTarget.set(null);
    this.visibleCount.set(PAGE);
    await this.loadTransactions();
  }

  protected ignore(t: BankTransactionResponse): Promise<void> {
    return this.run(async () => {
      await this.bank.ignore(t.id);
      this.transactions.update(list => list.filter(x => x.id !== t.id));
    });
  }

  protected restore(t: BankTransactionResponse): Promise<void> {
    return this.run(async () => {
      await this.bank.restore(t.id);
      this.transactions.update(list => list.filter(x => x.id !== t.id));
    });
  }

  protected async openAdd(t: BankTransactionResponse): Promise<void> {
    this.addDescription = '';
    this.customSplit.set(false);
    this.addTarget.set(t);
    if (this.groups().length === 0) {
      try {
        this.groups.set(await this.api.listGroups());
      } catch (e) {
        this.toast.show(httpError(e), 'err');
        return;
      }
    }
    this.onGroupChange(this.groupOptions()[0]?.value ?? '');
    this.addSourceId.set(suggestSource(t, this.sources(), this.learned())?.id ?? '');
  }

  protected toggleSplit(on: boolean): void {
    this.customSplit.set(on);
    if (on) {
      this.resetSplit();
    }
  }

  private resetSplit(): void {
    this.splitDraft = {};
    for (const p of this.splitParticipants()) {
      this.splitDraft[p.id] = p.defaultSharePercent;
    }
  }

  protected rebalance(changedId: string, value: number | string): void {
    const clamped = Math.max(0, Math.min(100, Number(value) || 0));
    this.splitDraft[changedId] = clamped;
    const others = this.splitParticipants().filter(p => p.id !== changedId).map(p => p.id);
    if (others.length === 0) {
      this.splitDraft[changedId] = 100;
      return;
    }
    const dist = this.distribute(others, this.splitDraft, Math.max(0, 100 - clamped));
    for (const id of others) {
      this.splitDraft[id] = dist[id];
    }
  }

  protected splitEvenly(): void {
    const ids = this.splitParticipants().map(p => p.id);
    const even: Record<string, number> = {};
    for (const id of ids) {
      even[id] = 1;
    }
    const dist = this.distribute(ids, even, 100);
    for (const id of ids) {
      this.splitDraft[id] = dist[id];
    }
  }

  protected splitTotal(): number {
    return round2(this.splitParticipants().reduce((sum, p) => sum + (Number(this.splitDraft[p.id]) || 0), 0));
  }

  protected splitBalanced(): boolean {
    return Math.abs(this.splitTotal() - 100) < 0.05;
  }

  private distribute(ids: string[], weights: Record<string, number>, target: number): Record<string, number> {
    const out: Record<string, number> = {};
    const sum = ids.reduce((s, id) => s + Math.max(0, Number(weights[id]) || 0), 0);
    let assigned = 0;
    ids.forEach((id, index) => {
      let share: number;
      if (index === ids.length - 1) share = round2(target - assigned);
      else if (sum > 0) share = round2(target * Math.max(0, Number(weights[id]) || 0) / sum);
      else share = round2(target / ids.length);
      share = Math.max(0, share);
      out[id] = share;
      assigned += share;
    });
    return out;
  }

  protected onGroupChange(groupId: string): void {
    this.addGroupId.set(groupId);
    if (this.customSplit()) {
      this.resetSplit();
    }
    const me = this.auth.user()?.id;
    const participants = this.groups().find(g => g.id === groupId)?.participants ?? [];
    this.addPayerId = (participants.find(p => p.userId === me) ?? participants[0])?.id ?? '';
  }

  protected confirmAdd(t: BankTransactionResponse): Promise<void> {
    return this.run(async () => {
      const groupId = this.addGroupId();
      const sourceId = this.addSourceId() || null;
      const done = await this.bank.addToGroup(t.id, {
        groupId: this.addGroupId(),
        payerParticipantId: this.addPayerId || null,
        sourceId: this.addSourceId() || null,
        description: this.addDescription.trim() || null,
        shares: this.customSplit()
          ? this.splitParticipants()
              .map(p => ({ participantId: p.id, percent: Number(this.splitDraft[p.id]) || 0 }))
              .filter(s => s.percent > 0)
          : null,
      });
      this.addTarget.set(null);
      this.transactions.update(list => list.filter(x => x.id !== t.id));
      this.remember(done, groupId, sourceId);
      this.toast.show(this.translate.instant('bank.added'));
    });
  }

  /** Keeps the just-created expense in mind so the next line from this merchant gets the same source. */
  private remember(done: BankTransactionResponse, groupId: string, sourceId: string | null): void {
    if (!done.importedExpenseId) {
      return;
    }
    const expense = {
      id: done.importedExpenseId,
      payerParticipantId: this.addPayerId,
      amount: Math.abs(done.amount),
      description: done.description,
      sourceId,
      occurredOn: done.occurredUtc.slice(0, 10),
    } as ExpenseResponse;
    this.importedLines.update(list => [...list, done]);
    this.expensesByGroup.update(map => ({ ...map, [groupId]: [...(map[groupId] ?? []), expense] }));
  }

  protected date(t: BankTransactionResponse): string {
    return new Date(t.occurredUtc).toLocaleDateString(this.translate.currentLang() || 'uk', { weekday: 'short', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
  }

  protected money(t: BankTransactionResponse): string {
    const sign = t.amount > 0 ? '+' : '−';
    return `${sign}${Math.abs(t.amount).toFixed(2)} ${t.currencyCode}`;
  }
}

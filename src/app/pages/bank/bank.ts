import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ThemeSwitcher } from '../../components/theme-switcher';
import { GlassSelect, SelectOption } from '../../components/glass-select';
import { BankService } from '../../services/bank.service';
import { MonobankError, MonobankTokenService, TokenAccount } from '../../services/monobank-token.service';
import { ExpensesService } from '../../services/expenses.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { BankAccountResponse, BankConnectionResponse, BankTransactionResponse, GroupResponse } from '../../models';
import { httpError } from '../../format';

type Tab = 'New' | 'Imported' | 'Ignored';

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function isoDate(date: Date): string {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

@Component({
  selector: 'app-bank',
  imports: [ThemeSwitcher, FormsModule, RouterLink, GlassSelect, TranslatePipe],
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
            <input class="input" type="password" name="monoToken" autocomplete="off" [(ngModel)]="token" [placeholder]="'bank.tokenPlaceholder' | translate" [disabled]="tokenBusy()" />
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

            @if (listLoading()) {
              <div class="loading"><div class="spinner"></div></div>
            } @else if (transactions().length === 0) {
              <div class="card"><div class="empty">{{ 'bank.empty' | translate }}</div></div>
            } @else {
              <div class="card rows">
                @for (t of transactions(); track t.id) {
                  <div class="row" style="flex-wrap:wrap">
                    <div class="row-main">
                      <div class="row-title">{{ t.description }}</div>
                      <div class="row-sub">{{ date(t) }}</div>
                    </div>
                    <div class="row-title" [style.color]="t.amount > 0 ? 'var(--pos)' : ''">{{ money(t) }}</div>
                    <div style="display:flex;align-items:center;gap:6px">
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
  protected readonly tokenAccounts = signal<TokenAccount[]>([]);
  protected readonly tokenAccountOptions = computed<SelectOption[]>(() =>
    this.tokenAccounts().map(a => ({ value: a.id, label: `${a.title} · ${a.balance.toFixed(2)} ${a.currencyCode}` })));

  protected readonly tabs: Tab[] = ['New', 'Imported', 'Ignored'];
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
    this.accountId = accounts[0]?.accountId ?? '';
  }

  private async loadTransactions(): Promise<void> {
    this.listLoading.set(true);
    try {
      this.transactions.set(await this.bank.listTransactions(this.tab()));
    } catch (e) {
      this.toast.show(httpError(e), 'err');
    } finally {
      this.listLoading.set(false);
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
        new Date(`${this.from}T00:00:00`),
        new Date(`${this.to}T23:59:59`),
        async lines => {
          if (lines.length === 0) {
            return;
          }
          const result = await this.bank.importLines(account.id, lines);
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

  protected async setTab(tab: Tab): Promise<void> {
    this.tab.set(tab);
    this.addTarget.set(null);
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
      await this.bank.addToGroup(t.id, {
        groupId: this.addGroupId(),
        payerParticipantId: this.addPayerId || null,
        description: this.addDescription.trim() || null,
        shares: this.customSplit()
          ? this.splitParticipants()
              .map(p => ({ participantId: p.id, percent: Number(this.splitDraft[p.id]) || 0 }))
              .filter(s => s.percent > 0)
          : null,
      });
      this.addTarget.set(null);
      this.transactions.update(list => list.filter(x => x.id !== t.id));
      this.toast.show(this.translate.instant('bank.added'));
    });
  }

  protected date(t: BankTransactionResponse): string {
    return new Date(t.occurredUtc).toLocaleDateString(this.translate.currentLang() || 'uk', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
  }

  protected money(t: BankTransactionResponse): string {
    const sign = t.amount > 0 ? '+' : '−';
    return `${sign}${Math.abs(t.amount).toFixed(2)} ${t.currencyCode}`;
  }
}

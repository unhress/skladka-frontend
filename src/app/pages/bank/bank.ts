import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ThemeSwitcher } from '../../components/theme-switcher';
import { GlassSelect, SelectOption } from '../../components/glass-select';
import { BankService } from '../../services/bank.service';
import { ExpensesService } from '../../services/expenses.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { BankAccountResponse, BankConnectionResponse, BankTransactionResponse, GroupResponse } from '../../models';
import { httpError } from '../../format';

type Tab = 'New' | 'Imported' | 'Ignored';

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
                        }
                        <div style="display:flex;gap:8px;justify-content:flex-end">
                          <button class="btn btn-ghost btn-sm" type="button" (click)="addTarget.set(null)">{{ 'common.cancel' | translate }}</button>
                          <button class="btn btn-primary btn-sm" type="button" (click)="confirmAdd(t)" [disabled]="busy() || !addGroupId()">{{ 'bank.addReceipt' | translate }}</button>
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>
            }
          </section>
        }

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

  protected onGroupChange(groupId: string): void {
    this.addGroupId.set(groupId);
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

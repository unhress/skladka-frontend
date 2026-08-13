import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ExpensesService, ShareInput } from '../../services/expenses.service';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { ActivityItem, BalanceResponse, GroupResponse, ParticipantResponse } from '../../models';
import { avatarClass, httpError, initials, money, moneySigned, shortDate } from '../../format';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-group',
  imports: [FormsModule, RouterLink],
  template: `
    @if (loading()) {
      <div class="app"><div class="loading"><div class="spinner"></div></div></div>
    } @else if (group(); as g) {
      <div class="app">
        <header class="topbar">
          <div class="topbar-left">
            <a class="icon-btn" routerLink="/" aria-label="Назад">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
            </a>
            @if (editingName()) {
              <input class="input" style="height:34px" name="nameDraft" [(ngModel)]="nameDraft" (keyup.enter)="saveName(g)" (keyup.escape)="editingName.set(false)" />
              <button class="icon-btn" type="button" (click)="saveName(g)" aria-label="Зберегти назву">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
              </button>
            } @else {
              <button class="title-strong" type="button" (click)="startRename(g)" style="background:none;border:0;padding:0;cursor:pointer;color:inherit;font:inherit;display:inline-flex;align-items:center;gap:6px">
                {{ g.name }}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--faint)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
              </button>
            }
          </div>
          <button class="icon-btn" type="button" (click)="theme.toggle()" aria-label="Змінити тему">
            @if (theme.effective() === 'dark') {
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2v2.5M12 19.5V22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M2 12h2.5M19.5 12H22M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/></svg>
            } @else {
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.3 6.3 0 0 0 10.5 10.5z"/></svg>
            }
          </button>
        </header>

        @let bal = balance();
        <section class="hero">
          @if (bal && bal.transfers.length > 0) {
            <div class="eyebrow">До сплати</div>
            <div class="settle-who"><b>{{ bal.transfers[0].fromName }}</b> винен <b>{{ bal.transfers[0].toName }}</b></div>
            <div class="settle-amount tnum">{{ money(bal.transfers[0].amount) }}</div>
            @if (bal.transfers.length > 1) { <div class="settle-note">…та ще {{ bal.transfers.length - 1 }} переказ</div> }
            <div class="hero-actions">
              <button class="btn btn-ghost" type="button" (click)="openSettle()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                Повернути борг
              </button>
            </div>
          } @else {
            <div class="eyebrow">Баланс</div>
            <div class="settle-amount" style="font-size:1.7rem">Усі розрахувалися 🎉</div>
            <div class="settle-note">Додай чеки — і побачиш, хто кому винен.</div>
          }
        </section>

        <section>
          <div class="section-head">
            <span class="section-title">Учасники</span>
            <button class="link" type="button" (click)="toggleSplit(g)">{{ showSplit() ? 'Готово' : 'Поділ' }}</button>
          </div>
          <div class="card rows">
            @for (p of g.participants; track p.id) {
              <div class="row">
                <div [class]="avatarClass(p.id)">{{ initials(p.displayName) }}</div>
                <div class="row-main">
                  <div class="row-title">{{ p.displayName }}@if (isMe(p)) { <span class="chip">ти</span> } @else if (p.userId) { <span class="chip">акаунт</span> }</div>
                  @if (!showSplit()) {
                    <div class="row-sub">частка {{ p.defaultSharePercent }}% · заплатив {{ money(paidFor(p.id)) }}</div>
                  }
                </div>
                @if (showSplit()) {
                  <div style="display:flex;align-items:center;gap:6px;color:var(--muted);font-size:13px">
                    <input class="input" type="number" step="0.01" [name]="'sp_' + p.id" [ngModel]="splitDraft[p.id]" (ngModelChange)="rebalance(p.id, $event)" style="height:38px;width:76px" /> %
                  </div>
                } @else {
                  <div class="amount tnum" [class.pos]="netFor(p.id) >= 0" [class.neg]="netFor(p.id) < 0">{{ moneySigned(netFor(p.id)) }}</div>
                }
              </div>
            }
          </div>

          @if (showSplit()) {
            <div class="card card-pad form-col" style="margin-top:10px">
              <button class="btn btn-primary btn-sm" type="button" (click)="saveSplit(g)" [disabled]="busy()">Зберегти поділ</button>
              <div class="section-title" style="margin-top:6px">Додати учасника</div>
              <div class="form-row">
                <input class="input" name="paName" [(ngModel)]="paName" placeholder="Ім'я" />
                <input class="input w-pct" type="number" step="0.01" name="paShare" [(ngModel)]="paShare" placeholder="%" />
              </div>
              <input class="input" name="paLink" [(ngModel)]="paLink" placeholder="@логін або email (щоб приєднати акаунт)" autocapitalize="off" autocomplete="off" />
              <button class="btn btn-ghost btn-sm" type="button" (click)="addParticipant(g)" [disabled]="busy() || (!paName.trim() && !paLink.trim())">Додати</button>
              <div class="error">{{ error() }}</div>
            </div>
          }
        </section>

        <section>
          <div class="section-head"><span class="section-title">Історія</span></div>
          @if (activity().length === 0) {
            <div class="card"><div class="empty">Ще порожньо. Додай перший чек 👇</div></div>
          } @else {
            <div class="card rows">
              @for (a of activity(); track a.id) {
                <div class="row">
                  <div class="avatar" aria-hidden="true">
                    @if (a.type === 'settlement') {
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M7 11l-4 4 4 4"/><path d="M3 15h13a4 4 0 0 0 4-4V5"/></svg>
                    } @else {
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2h9l3 3v17l-2.4-1.4L13 22l-2.6-1.4L8 22l-2.6-1.4L3 22V4a2 2 0 0 1 2-2z"/><path d="M8 8h6M8 12h6"/></svg>
                    }
                  </div>
                  <div class="row-main">
                    <div class="row-title">{{ a.title }}</div>
                    <div class="row-sub">{{ a.subtitle }} · {{ shortDate(a.date) }}</div>
                  </div>
                  <div class="amount tnum" [class.pos]="a.type === 'settlement'" [class.plain]="a.type === 'expense'">{{ money(a.amount) }}</div>
                </div>
              }
            </div>
          }
        </section>

        <div class="foot">Skladka</div>
      </div>

      <div class="fab-wrap">
        <button class="btn btn-primary btn-lg" type="button" (click)="openAdd(g)">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
          Додати чек
        </button>
      </div>

      @if (showAdd()) {
        <div class="scrim" (click)="showAdd.set(false)">
          <div class="sheet" (click)="$event.stopPropagation()">
            <div class="sheet-head"><div class="sheet-title">Новий чек</div>
              <button class="icon-btn" type="button" (click)="showAdd.set(false)" aria-label="Закрити"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
            </div>
            <div class="form-col">
              <div class="form-row">
                <label class="field" style="flex:1.4"><span>Сума, ₴</span><input class="input" type="number" step="0.01" name="exAmount" [(ngModel)]="exAmount" /></label>
                <label class="field"><span>Хто платив</span>
                  <select class="input" name="exPayer" [(ngModel)]="exPayer">
                    @for (p of g.participants; track p.id) { <option [value]="p.id">{{ p.displayName }}</option> }
                  </select>
                </label>
              </div>
              <label class="field"><span>Опис</span><input class="input" name="exDesc" [(ngModel)]="exDesc" placeholder="За що (напр. Продукти)" /></label>
              <button class="btn btn-primary btn-block btn-lg" type="button" (click)="addExpense(g)" [disabled]="busy() || !exDesc.trim() || !exAmount">@if (busy()) { <span class="btn-spin"></span> } Зберегти чек</button>
              <div class="error">{{ error() }}</div>
            </div>
          </div>
        </div>
      }

      @if (showSettle()) {
        <div class="scrim" (click)="showSettle.set(false)">
          <div class="sheet" (click)="$event.stopPropagation()">
            <div class="sheet-head"><div class="sheet-title">Повернути борг</div>
              <button class="icon-btn" type="button" (click)="showSettle.set(false)" aria-label="Закрити"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
            </div>
            <div class="form-col">
              <div class="form-row">
                <label class="field"><span>Від кого</span>
                  <select class="input" name="seFrom" [(ngModel)]="seFrom">
                    @for (p of g.participants; track p.id) { <option [value]="p.id">{{ p.displayName }}</option> }
                  </select>
                </label>
                <label class="field"><span>Кому</span>
                  <select class="input" name="seTo" [(ngModel)]="seTo">
                    @for (p of g.participants; track p.id) { <option [value]="p.id">{{ p.displayName }}</option> }
                  </select>
                </label>
              </div>
              <label class="field"><span>Сума, ₴ (можна частково)</span><input class="input" type="number" step="0.01" name="seAmount" [(ngModel)]="seAmount" /></label>
              <button class="btn btn-primary btn-block btn-lg" type="button" (click)="settle(g)" [disabled]="busy() || !seAmount || seFrom === seTo">@if (busy()) { <span class="btn-spin"></span> } Записати повернення</button>
              <div class="error">{{ error() }}</div>
            </div>
          </div>
        </div>
      }
    } @else {
      <div class="app"><div class="empty" style="margin-top:60px">{{ error() || 'Групу не знайдено.' }}</div></div>
    }
  `,
})
export class Group {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ExpensesService);
  private readonly auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);
  private readonly toast = inject(ToastService);

  protected readonly money = money;
  protected readonly moneySigned = moneySigned;
  protected readonly shortDate = shortDate;
  protected readonly initials = initials;
  protected readonly avatarClass = avatarClass;

  protected readonly group = signal<GroupResponse | null>(null);
  protected readonly balance = signal<BalanceResponse | null>(null);
  protected readonly activity = signal<ActivityItem[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly busy = signal(false);

  protected readonly showAdd = signal(false);
  protected readonly showSettle = signal(false);
  protected readonly showSplit = signal(false);
  protected readonly editingName = signal(false);

  protected exAmount: number | null = null;
  protected exDesc = '';
  protected exPayer = '';

  protected seFrom = '';
  protected seTo = '';
  protected seAmount: number | null = null;

  protected splitDraft: Record<string, number> = {};
  protected paName = '';
  protected paShare: number | null = null;
  protected paLink = '';
  protected nameDraft = '';

  private groupId = '';

  constructor() {
    this.groupId = this.route.snapshot.paramMap.get('id') ?? '';
    void this.load();
  }

  protected isMe(p: ParticipantResponse): boolean {
    return !!p.userId && p.userId === this.auth.user()?.id;
  }

  protected participantName(id: string): string {
    return this.group()?.participants.find(p => p.id === id)?.displayName ?? '—';
  }

  protected netFor(id: string): number {
    return this.balance()?.balances.find(b => b.participantId === id)?.net ?? 0;
  }

  protected paidFor(id: string): number {
    return this.balance()?.balances.find(b => b.participantId === id)?.paid ?? 0;
  }

  protected openAdd(g: GroupResponse): void {
    const mine = g.participants.find(p => this.isMe(p));
    this.exPayer = (mine ?? g.participants[0])?.id ?? '';
    this.exAmount = null;
    this.exDesc = '';
    this.error.set('');
    this.showAdd.set(true);
  }

  protected openSettle(): void {
    const t = this.balance()?.transfers[0];
    const parts = this.group()?.participants ?? [];
    this.seFrom = t?.fromParticipantId ?? parts[0]?.id ?? '';
    this.seTo = t?.toParticipantId ?? parts[1]?.id ?? '';
    this.seAmount = t?.amount ?? null;
    this.error.set('');
    this.showSettle.set(true);
  }

  protected toggleSplit(g: GroupResponse): void {
    if (!this.showSplit()) {
      this.splitDraft = {};
      for (const p of g.participants) this.splitDraft[p.id] = p.defaultSharePercent;
      this.paName = '';
      this.paShare = null;
    }
    this.error.set('');
    this.showSplit.set(!this.showSplit());
  }

  protected startRename(g: GroupResponse): void {
    this.nameDraft = g.name;
    this.editingName.set(true);
  }

  protected async saveName(g: GroupResponse): Promise<void> {
    const name = this.nameDraft.trim();
    this.editingName.set(false);
    if (!name || name === g.name) return;
    await this.run(async () => { await this.api.renameGroup(g.id, name); }, 'Назву оновлено');
  }

  protected rebalance(changedId: string, value: number | string): void {
    const g = this.group();
    if (!g) return;
    const clamped = Math.max(0, Math.min(100, Number(value) || 0));
    this.splitDraft[changedId] = clamped;

    const others = g.participants.filter(p => p.id !== changedId);
    if (others.length === 0) return;

    const remaining = 100 - clamped;
    const otherSum = others.reduce((sum, p) => sum + (Number(this.splitDraft[p.id]) || 0), 0);
    let assigned = 0;
    others.forEach((p, index) => {
      let share: number;
      if (index === others.length - 1) {
        share = round2(remaining - assigned);
      } else if (otherSum > 0) {
        share = round2(remaining * (Number(this.splitDraft[p.id]) || 0) / otherSum);
      } else {
        share = round2(remaining / others.length);
      }
      this.splitDraft[p.id] = Math.max(0, share);
      assigned += share;
    });
  }

  protected async addExpense(g: GroupResponse): Promise<void> {
    if (!this.exAmount || !this.exDesc.trim()) return;
    await this.run(async () => {
      await this.api.addExpense(g.id, { payerParticipantId: this.exPayer, amount: this.exAmount!, description: this.exDesc.trim() });
      this.showAdd.set(false);
    }, 'Чек додано');
  }

  protected async settle(g: GroupResponse): Promise<void> {
    if (!this.seAmount || this.seFrom === this.seTo) return;
    await this.run(async () => {
      await this.api.recordSettlement(g.id, { fromParticipantId: this.seFrom, toParticipantId: this.seTo, amount: this.seAmount! });
      this.showSettle.set(false);
    }, 'Повернення записано');
  }

  protected async addParticipant(g: GroupResponse): Promise<void> {
    if (!this.paName.trim() && !this.paLink.trim()) return;
    await this.run(async () => {
      await this.api.addParticipant(g.id, this.paName.trim(), this.paShare ?? 0, this.paLink.trim() || undefined);
      this.paName = '';
      this.paShare = null;
      this.paLink = '';
      this.showSplit.set(false);
    }, 'Учасника додано');
  }

  protected async saveSplit(g: GroupResponse): Promise<void> {
    const shares: ShareInput[] = g.participants.map(p => ({ participantId: p.id, percent: Number(this.splitDraft[p.id] ?? 0) }));
    await this.run(async () => {
      await this.api.setSplit(g.id, shares);
      this.showSplit.set(false);
    }, 'Поділ збережено');
  }

  private async run(action: () => Promise<void>, okMessage: string): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    try {
      await action();
      await this.reload();
      this.toast.show(okMessage);
    } catch (e) {
      const message = httpError(e);
      this.error.set(message);
      this.toast.show(message, 'err');
    } finally {
      this.busy.set(false);
    }
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      await this.reload();
    } catch (e) {
      this.error.set(httpError(e));
    } finally {
      this.loading.set(false);
    }
  }

  private async reload(): Promise<void> {
    const [group, balance, activity] = await Promise.all([
      this.api.getGroup(this.groupId),
      this.api.getBalance(this.groupId),
      this.api.getActivity(this.groupId),
    ]);
    this.group.set(group);
    this.balance.set(balance);
    this.activity.set(activity);
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

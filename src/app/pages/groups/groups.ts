import { ThemeSwitcher } from '../../components/theme-switcher';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ExpensesService } from '../../services/expenses.service';
import { ThemeService } from '../../services/theme.service';
import { ToastService } from '../../services/toast.service';
import { GroupResponse } from '../../models';
import { avatarClass, httpError, initials } from '../../format';

const CURRENCIES = ['UAH', 'USD', 'EUR', 'PLN', 'GBP', 'CZK'];

@Component({
  selector: 'app-groups',
  imports: [ThemeSwitcher, FormsModule, RouterLink],
  styles: [`
    .glink{display:flex;align-items:center;gap:12px;flex:1;min-width:0;color:inherit;text-decoration:none}
    .glink .row-title{text-decoration:none}
  `],
  template: `
    <div class="app">
      <header class="topbar">
        <div class="brand">Sk<b>lad</b>ka</div>
        <div class="top-actions">
          <a class="icon-btn" routerLink="/sources" aria-label="Джерела">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
          </a>
          <a class="icon-btn" routerLink="/friends" aria-label="Друзі">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </a>
          <a class="icon-btn" routerLink="/profile" aria-label="Профіль">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/></svg>
          </a>
          <app-theme-switcher />
          <button class="icon-btn" type="button" (click)="logout()" aria-label="Вийти">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
          </button>
        </div>
      </header>

      @if (loading()) {
        <div class="loading"><div class="spinner"></div></div>
      } @else {
        <section>
          <div class="section-head"><span class="section-title">Мої групи</span></div>
          @if (groups().length === 0) {
            <div class="card"><div class="empty">Груп ще немає. Створи першу нижче 👇</div></div>
          } @else {
            <div class="card rows">
              @for (g of groups(); track g.id) {
                <div class="row">
                  <a class="glink" [routerLink]="['/groups', g.id]">
                    <div [class]="avatarClass(g.id)">{{ letter(g.name) }}</div>
                    <div class="row-main">
                      <div class="row-title">{{ g.name }}</div>
                      <div class="row-sub">{{ g.participants.length }} уч. · {{ g.currencyCode }}</div>
                    </div>
                  </a>
                  <button class="icon-btn" type="button" (click)="openQuick(g)" aria-label="Швидко додати чек" title="Додати чек">
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2h9l3 3v9"/><path d="M18 22l-2.4-1.4L13 22l-2.6-1.4L8 22l-2.6-1.4L3 22V4a2 2 0 0 1 2-2"/><path d="M15 15h6M18 12v6"/></svg>
                  </button>
                </div>
              }
            </div>
          }
        </section>

        <section>
          <div class="section-head"><span class="section-title">Нова група</span></div>
          <div class="card card-pad form-col">
            <div class="form-row">
              <input class="input" name="name" [(ngModel)]="name" placeholder="Назва (напр. Родина)" />
              <select class="input w-pct" name="currency" [(ngModel)]="currency" aria-label="Валюта">
                @for (c of currencies; track c) { <option [value]="c">{{ c }}</option> }
              </select>
            </div>
            <button class="btn btn-primary" type="button" (click)="create()" [disabled]="creating() || !name.trim()">@if (creating()) { <span class="btn-spin"></span> } Створити</button>
            <div class="error">{{ error() }}</div>
          </div>
        </section>

      }
    </div>

    @if (quickGroup(); as qg) {
      <div class="scrim" (pointerdown)="scrimArmed = $event.target === $event.currentTarget" (click)="scrimArmed && quickGroup.set(null)">
        <div class="sheet" (click)="$event.stopPropagation()">
          <div class="sheet-head"><div class="sheet-title">Чек · {{ qg.name }}</div>
            <button class="icon-btn" type="button" (click)="quickGroup.set(null)" aria-label="Закрити"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
          <div class="form-col">
            <div class="form-row">
              <label class="field" style="flex:1.4"><span>Сума, ₴</span><input class="input" type="number" step="0.01" name="qAmount" [(ngModel)]="quickAmount" /></label>
              <label class="field"><span>Хто платив</span>
                <select class="input" name="qPayer" [(ngModel)]="quickPayer">
                  @for (p of qg.participants; track p.id) { <option [value]="p.id">{{ p.displayName }}</option> }
                </select>
              </label>
            </div>
            <label class="field"><span>Опис</span><input class="input" name="qDesc" [(ngModel)]="quickDesc" placeholder="За що (напр. Продукти)" /></label>
            <button class="btn btn-primary btn-block btn-lg" type="button" (click)="quickAdd(qg)" [disabled]="quickBusy() || !quickDesc.trim() || !quickAmount">@if (quickBusy()) { <span class="btn-spin"></span> } Зберегти чек</button>
            <div class="error">{{ quickError() }}</div>
          </div>
        </div>
      </div>
    }
  `,
})
export class Groups {
  private readonly expenses = inject(ExpensesService);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  protected readonly theme = inject(ThemeService);
  protected readonly avatarClass = avatarClass;
  protected readonly currencies = CURRENCIES;

  protected readonly groups = signal<GroupResponse[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly creating = signal(false);

  protected readonly quickGroup = signal<GroupResponse | null>(null);
  protected readonly quickBusy = signal(false);
  protected readonly quickError = signal('');
  protected quickAmount: number | null = null;
  protected quickPayer = '';
  protected quickDesc = '';

  protected name = '';
  protected currency = 'UAH';
  protected scrimArmed = false;

  constructor() {
    void this.load();
  }

  protected letter(name: string): string {
    return initials(name);
  }

  protected openQuick(g: GroupResponse): void {
    const mine = g.participants.find(p => !!p.userId && p.userId === this.auth.user()?.id);
    this.quickPayer = (mine ?? g.participants[0])?.id ?? '';
    this.quickAmount = null;
    this.quickDesc = '';
    this.quickError.set('');
    this.quickGroup.set(g);
  }

  protected async quickAdd(g: GroupResponse): Promise<void> {
    if (!this.quickAmount || !this.quickDesc.trim()) return;
    this.quickBusy.set(true);
    this.quickError.set('');
    try {
      await this.expenses.addExpense(g.id, {
        payerParticipantId: this.quickPayer,
        amount: this.quickAmount,
        description: this.quickDesc.trim(),
      });
      this.quickGroup.set(null);
      this.toast.show('Чек додано');
    } catch (e) {
      this.quickError.set(httpError(e));
    } finally {
      this.quickBusy.set(false);
    }
  }

  protected async create(): Promise<void> {
    if (!this.name.trim()) return;
    this.creating.set(true);
    this.error.set('');
    try {
      const group = await this.expenses.createGroup(
        this.name.trim(), (this.currency.trim() || 'UAH').toUpperCase(), this.auth.displayName());
      this.name = '';
      await this.router.navigate(['/groups', group.id]);
    } catch (e) {
      this.error.set(httpError(e));
    } finally {
      this.creating.set(false);
    }
  }

  protected logout(): void {
    this.auth.logout();
    void this.router.navigate(['/login']);
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      this.groups.set(await this.expenses.listGroups());
    } catch (e) {
      this.error.set(httpError(e));
    } finally {
      this.loading.set(false);
    }
  }
}

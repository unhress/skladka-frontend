import { ThemeSwitcher } from '../../components/theme-switcher';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ExpensesService } from '../../services/expenses.service';
import { ThemeService } from '../../services/theme.service';
import { GroupResponse } from '../../models';
import { avatarClass, httpError, initials } from '../../format';
import { GlassSelect, SelectOption } from '../../components/glass-select';
import { TranslatePipe } from '@ngx-translate/core';

const CURRENCY_OPTIONS: SelectOption[] = [
  { value: 'UAH', label: 'Гривня', short: '₴' },
  { value: 'USD', label: 'Долар', short: '$' },
  { value: 'EUR', label: 'Євро', short: '€' },
  { value: 'PLN', label: 'Злотий', short: 'zł' },
  { value: 'GBP', label: 'Фунт', short: '£' },
  { value: 'CZK', label: 'Крона', short: 'Kč' },
];

@Component({
  selector: 'app-groups',
  imports: [ThemeSwitcher, FormsModule, RouterLink, GlassSelect, TranslatePipe],
  styles: [`
    .glink{display:flex;align-items:center;gap:12px;flex:1;min-width:0;color:inherit;text-decoration:none}
    .glink .row-title{text-decoration:none}
  `],
  template: `
    <div class="app">
      <header class="topbar">
        <div class="brand">Sk<b>lad</b>ka</div>
        <div class="top-actions">
          <a class="icon-btn" routerLink="/sources" [attr.aria-label]="'nav.sources' | translate">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
          </a>
          <a class="icon-btn" routerLink="/friends" [attr.aria-label]="'nav.friends' | translate">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </a>
          <a class="icon-btn" routerLink="/profile" [attr.aria-label]="'nav.profile' | translate">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/></svg>
          </a>
          <app-theme-switcher />
          <button class="icon-btn" type="button" (click)="logout()" [attr.aria-label]="'nav.logout' | translate">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
          </button>
        </div>
      </header>

      @if (loading()) {
        <div class="loading"><div class="spinner"></div></div>
      } @else {
        <section>
          <div class="section-head"><span class="section-title">{{ 'groups.myGroups' | translate }}</span></div>
          @if (groups().length === 0) {
            <div class="card"><div class="empty">{{ 'groups.empty' | translate }}</div></div>
          } @else {
            <div class="card rows">
              @for (g of groups(); track g.id) {
                <div class="row">
                  <a class="glink" [routerLink]="['/groups', g.id]">
                    @if (g.iconUrl) {
                      <div [class]="avatarClass(g.id)" style="overflow:hidden;padding:0"><img [src]="g.iconUrl" alt="" style="width:100%;height:100%;object-fit:cover" /></div>
                    } @else if (g.emoji) {
                      <div [class]="avatarClass(g.id)" style="font-size:19px">{{ g.emoji }}</div>
                    } @else {
                      <div [class]="avatarClass(g.id)">{{ letter(g.name) }}</div>
                    }
                    <div class="row-main">
                      <div class="row-title">{{ g.name }}</div>
                      <div class="row-sub">{{ g.participants.length }} {{ 'groups.participantsShort' | translate }} · {{ g.currencyCode }}</div>
                    </div>
                  </a>
                  <button class="icon-btn" type="button" (click)="openQuick(g)" [attr.aria-label]="'groups.quickAddAria' | translate" [title]="'groups.quickAddAria' | translate">
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2h9l3 3v9"/><path d="M18 22l-2.4-1.4L13 22l-2.6-1.4L8 22l-2.6-1.4L3 22V4a2 2 0 0 1 2-2"/><path d="M15 15h6M18 12v6"/></svg>
                  </button>
                </div>
              }
            </div>
          }
        </section>

        <section>
          <div class="section-head"><span class="section-title">{{ 'groups.newGroup' | translate }}</span></div>
          <div class="card card-pad form-col">
            <div class="form-row">
              <input class="input" name="name" [(ngModel)]="name" [placeholder]="'groups.namePlaceholder' | translate" style="flex:1.7" />
              <app-glass-select style="flex:0 0 132px" [(value)]="currency" [options]="currencyOptions" ariaLabel="Валюта" />
            </div>
            <button class="btn btn-primary" type="button" (click)="create()" [disabled]="creating() || !name.trim()">@if (creating()) { <span class="btn-spin"></span> } {{ 'groups.create' | translate }}</button>
            <div class="error">{{ error() }}</div>
          </div>
        </section>

      }
    </div>
  `,
})
export class Groups {
  private readonly expenses = inject(ExpensesService);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);
  protected readonly avatarClass = avatarClass;
  protected readonly currencyOptions = CURRENCY_OPTIONS;

  protected readonly groups = signal<GroupResponse[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly creating = signal(false);

  protected name = '';
  protected currency = 'UAH';

  constructor() {
    void this.load();
  }

  protected letter(name: string): string {
    return initials(name);
  }

  /** Opens the real, full add-expense window on the group page — same UI everywhere, no duplicate. */
  protected openQuick(g: GroupResponse): void {
    void this.router.navigate(['/groups', g.id], { queryParams: { add: '1' } });
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

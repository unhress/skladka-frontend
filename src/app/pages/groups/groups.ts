import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ExpensesService } from '../../services/expenses.service';
import { ThemeService } from '../../services/theme.service';
import { GroupResponse } from '../../models';
import { avatarClass, httpError, initials } from '../../format';

@Component({
  selector: 'app-groups',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="app">
      <header class="topbar">
        <div class="brand">Sk<b>lad</b>ka</div>
        <div class="top-actions">
          <button class="icon-btn" type="button" (click)="theme.toggle()" aria-label="Змінити тему">
            @if (theme.effective() === 'dark') {
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2v2.5M12 19.5V22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M2 12h2.5M19.5 12H22M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/></svg>
            } @else {
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.3 6.3 0 0 0 10.5 10.5z"/></svg>
            }
          </button>
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
                <a class="row row-btn" [routerLink]="['/groups', g.id]">
                  <div [class]="avatarClass(g.id)">{{ letter(g.name) }}</div>
                  <div class="row-main">
                    <div class="row-title">{{ g.name }}</div>
                    <div class="row-sub">{{ g.participants.length }} уч. · {{ g.currencyCode }}</div>
                  </div>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--faint)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>
                </a>
              }
            </div>
          }
        </section>

        <section>
          <div class="section-head"><span class="section-title">Нова група</span></div>
          <div class="card card-pad form-col">
            <div class="form-row">
              <input class="input" name="name" [(ngModel)]="name" placeholder="Назва (напр. Родина)" />
              <input class="input w-pct" name="currency" [(ngModel)]="currency" placeholder="UAH" />
            </div>
            <button class="btn btn-primary" type="button" (click)="create()" [disabled]="creating() || !name.trim()">@if (creating()) { <span class="btn-spin"></span> } Створити</button>
            <div class="error">{{ error() }}</div>
          </div>
        </section>

        <div class="foot">Skladka · спільні витрати без зайвих підрахунків</div>
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

import { ThemeSwitcher } from '../../components/theme-switcher';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { ToastService } from '../../services/toast.service';
import { UserProfile } from '../../models';
import { avatarClass, httpError, initials } from '../../format';

@Component({
  selector: 'app-users',
  imports: [ThemeSwitcher, RouterLink, TranslatePipe],
  styles: [`
    .uav{width:40px;height:40px;border-radius:50%;object-fit:cover;flex:0 0 auto}
    .useen{font-size:12px;color:var(--muted);flex:0 0 auto;white-space:nowrap;margin-right:2px}
  `],
  template: `
    <div class="app">
      <header class="topbar">
        <div class="topbar-left">
          <a class="icon-btn" routerLink="/" [attr.aria-label]="'nav.back' | translate">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </a>
          <div class="title-strong">{{ 'users.title' | translate }}</div>
        </div>
        <app-theme-switcher />
      </header>

      <section>
        <div class="section-head"><span class="section-title">{{ 'users.count' | translate:{ count: users().length } }}</span></div>
        @if (loading()) {
          <div class="loading"><div class="spinner"></div></div>
        } @else if (error()) {
          <div class="card"><div class="empty">{{ error() }}</div></div>
        } @else {
          <div class="card rows">
            @for (u of users(); track u.id) {
              <div class="row">
                @if (u.avatarUrl) {
                  <img class="uav" [src]="u.avatarUrl" alt="" />
                } @else {
                  <div [class]="avatarClass(u.id)">{{ initials(name(u)) }}</div>
                }
                <div class="row-main">
                  <div class="row-title">{{ name(u) }}@if (u.isAdmin) { <span class="chip">{{ 'users.adminChip' | translate }}</span> }</div>
                  <div class="row-sub">{{ u.email }}@if (u.handle) { · &#64;{{ u.handle }} }</div>
                </div>
                <span class="useen">{{ 'users.lastSeen' | translate }}: {{ lastSeen(u) }}</span>
                @if (u.id !== myId) {
                  <button class="icon-btn" type="button" (click)="remove(u)" [disabled]="busy()" [attr.aria-label]="'users.deleteAria' | translate">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
                  </button>
                }
              </div>
            }
          </div>
        }
      </section>
    </div>
  `,
})
export class Users {
  private readonly auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);
  protected readonly avatarClass = avatarClass;
  protected readonly initials = initials;

  protected readonly users = signal<UserProfile[]>([]);
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly myId = this.auth.user()?.id ?? '';

  constructor() {
    void this.load();
  }

  protected name(u: UserProfile): string {
    return [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email;
  }

  protected lastSeen(u: UserProfile): string {
    return u.lastSeenUtc ? new Date(u.lastSeenUtc).toLocaleString() : this.translate.instant('users.never');
  }

  protected async remove(u: UserProfile): Promise<void> {
    if (!confirm(this.translate.instant('users.confirmDelete', { name: this.name(u) }))) return;
    this.busy.set(true);
    try {
      await this.auth.deleteUser(u.id);
      this.users.set(this.users().filter(x => x.id !== u.id));
      this.toast.show(this.translate.instant('users.toastDeleted'));
    } catch (e) {
      this.toast.show(httpError(e), 'err');
    } finally {
      this.busy.set(false);
    }
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      this.users.set(await this.auth.listUsers());
    } catch (e) {
      this.error.set(httpError(e));
    } finally {
      this.loading.set(false);
    }
  }
}

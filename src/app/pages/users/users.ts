import { ThemeSwitcher } from '../../components/theme-switcher';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { ToastService } from '../../services/toast.service';
import { UserDetail, UserProfile } from '../../models';
import { avatarClass, httpError, initials } from '../../format';

@Component({
  selector: 'app-users',
  imports: [ThemeSwitcher, RouterLink, TranslatePipe],
  styles: [`
    .uav{width:40px;height:40px;border-radius:50%;object-fit:cover;flex:0 0 auto}
    .uav-lg{width:60px;height:60px;border-radius:50%;object-fit:cover;flex:0 0 auto;display:grid;place-items:center;font-size:21px;font-weight:650;background:var(--surface-2);color:var(--muted)}
    .urow{cursor:pointer}
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
              <div class="row urow" (click)="openDetail(u)">
                @if (u.avatarUrl) {
                  <img class="uav" [src]="u.avatarUrl" alt="" />
                } @else {
                  <div [class]="avatarClass(u.id)">{{ initials(name(u)) }}</div>
                }
                <div class="row-main">
                  <div class="row-title">{{ name(u) }}@if (u.isAdmin) { <span class="chip">{{ 'users.adminChip' | translate }}</span> }</div>
                  <div class="row-sub">{{ u.email }}@if (u.email && u.handle) { · }@if (u.handle) { &#64;{{ u.handle }} }</div>
                </div>
                @if (u.id !== myId) {
                  <button class="icon-btn" type="button" (click)="$event.stopPropagation(); remove(u)" [disabled]="busy()" [attr.aria-label]="'users.deleteAria' | translate">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
                  </button>
                }
              </div>
            }
          </div>
        }
      </section>
    </div>

    @if (detailUser(); as u) {
      <div class="scrim" (click)="closeDetail()">
        <div class="sheet" (click)="$event.stopPropagation()">
          <div class="sheet-head"><div class="sheet-title">{{ name(u) }}</div>
            <button class="icon-btn" type="button" (click)="closeDetail()" [attr.aria-label]="'common.close' | translate"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
          <div class="form-col">
            <div style="display:flex;align-items:center;gap:14px">
              @if (u.avatarUrl) { <img class="uav-lg" [src]="u.avatarUrl" alt="" /> } @else { <div class="uav-lg">{{ initials(name(u)) }}</div> }
              <div style="min-width:0">
                <div class="row-title">{{ name(u) }}@if (u.isAdmin) { <span class="chip">{{ 'users.adminChip' | translate }}</span> }</div>
                @if (u.email) { <div class="row-sub">{{ u.email }}</div> }
                @if (u.handle) { <div class="row-sub">&#64;{{ u.handle }}</div> }
                <div class="row-sub">{{ 'users.lastSeen' | translate }}: {{ lastSeen(u) }}</div>
              </div>
            </div>

            @if (detailLoading()) {
              <div class="loading" style="padding:20px 0"><div class="spinner"></div></div>
            } @else {
              <div class="section-title" style="margin-top:6px">{{ 'users.groupsLabel' | translate }} ({{ detail()?.groups?.length ?? 0 }})</div>
              @if (!detail()?.groups?.length) {
                <div class="row-sub">{{ 'users.none' | translate }}</div>
              } @else {
                <div class="card rows">
                  @for (g of detail()!.groups; track g.id) {
                    <div class="row">
                      @if (g.iconUrl) { <div [class]="avatarClass(g.id)" style="overflow:hidden;padding:0"><img [src]="g.iconUrl" alt="" style="width:100%;height:100%;object-fit:cover" /></div> }
                      @else if (g.emoji) { <div [class]="avatarClass(g.id)" style="font-size:19px">{{ g.emoji }}</div> }
                      @else { <div [class]="avatarClass(g.id)">{{ initials(g.name) }}</div> }
                      <div class="row-main">
                        <div class="row-title">{{ g.name }}</div>
                        <div class="row-sub">{{ g.participants.length }} {{ 'groups.participantsShort' | translate }} · {{ g.currencyCode }}</div>
                      </div>
                    </div>
                  }
                </div>
              }

              <div class="section-title" style="margin-top:8px">{{ 'users.friendsLabel' | translate }} ({{ detail()?.friends?.length ?? 0 }})</div>
              @if (!detail()?.friends?.length) {
                <div class="row-sub">{{ 'users.none' | translate }}</div>
              } @else {
                <div class="card rows">
                  @for (f of detail()!.friends; track f.userId) {
                    <div class="row">
                      @if (f.avatarUrl) { <img class="uav" [src]="f.avatarUrl" alt="" /> } @else { <div [class]="avatarClass(f.userId)">{{ initials(f.displayName) }}</div> }
                      <div class="row-main">
                        <div class="row-title">{{ f.displayName }}</div>
                        @if (f.handle) { <div class="row-sub">&#64;{{ f.handle }}</div> }
                      </div>
                    </div>
                  }
                </div>
              }
            }
          </div>
        </div>
      </div>
    }
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

  protected readonly detailUser = signal<UserProfile | null>(null);
  protected readonly detail = signal<UserDetail | null>(null);
  protected readonly detailLoading = signal(false);

  constructor() {
    void this.load();
  }

  protected name(u: UserProfile): string {
    return [u.firstName, u.lastName].filter(Boolean).join(' ') || (u.handle ? '@' + u.handle : u.email);
  }

  protected lastSeen(u: UserProfile): string {
    return u.lastSeenUtc ? new Date(u.lastSeenUtc).toLocaleString() : this.translate.instant('users.never');
  }

  protected async openDetail(u: UserProfile): Promise<void> {
    this.detailUser.set(u);
    this.detail.set(null);
    this.detailLoading.set(true);
    try {
      this.detail.set(await this.auth.getUserDetail(u.id));
    } catch (e) {
      this.toast.show(httpError(e), 'err');
    } finally {
      this.detailLoading.set(false);
    }
  }

  protected closeDetail(): void {
    this.detailUser.set(null);
    this.detail.set(null);
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

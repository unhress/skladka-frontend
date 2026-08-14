import { ThemeSwitcher } from '../../components/theme-switcher';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { ToastService } from '../../services/toast.service';
import { Friend } from '../../models';
import { avatarClass, httpError, initials } from '../../format';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-friends',
  imports: [ThemeSwitcher, FormsModule, RouterLink, TranslatePipe],
  styles: [`
    .fav{width:40px;height:40px;border-radius:50%;object-fit:cover;flex:0 0 auto}
  `],
  template: `
    <div class="app">
      <header class="topbar">
        <div class="topbar-left">
          <a class="icon-btn" routerLink="/" [attr.aria-label]="'nav.back' | translate">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </a>
          <div class="title-strong">{{ 'friends.title' | translate }}</div>
        </div>
        <app-theme-switcher />
      </header>

      <section>
        <div class="section-head"><span class="section-title">{{ 'friends.addFriend' | translate }}</span></div>
        <div class="card card-pad form-col">
          <div class="form-row">
            <input class="input" name="query" [(ngModel)]="query" [placeholder]="'friends.queryPlaceholder' | translate" autocapitalize="off" autocomplete="off" (keyup.enter)="add()" />
            <button class="btn btn-primary" type="button" (click)="add()" [disabled]="adding() || !query.trim()">@if (adding()) { <span class="btn-spin"></span> } {{ 'friends.add' | translate }}</button>
          </div>
          <div class="row-sub">{{ 'friends.addHint' | translate }}</div>
          <div class="error">{{ error() }}</div>
        </div>
      </section>

      @if (requests().length > 0) {
        <section>
          <div class="section-head"><span class="section-title">{{ 'friends.requests' | translate }}</span></div>
          <div class="card rows">
            @for (r of requests(); track r.userId) {
              <div class="row">
                @if (r.avatarUrl) {
                  <img class="fav" [src]="r.avatarUrl" alt="" />
                } @else {
                  <div [class]="avatarClass(r.userId)">{{ initials(r.displayName) }}</div>
                }
                <div class="row-main">
                  <div class="row-title">{{ r.displayName }}</div>
                  @if (r.handle) { <div class="row-sub">&#64;{{ r.handle }}</div> }
                </div>
                <div style="display:flex;gap:6px">
                  <button class="btn btn-primary btn-sm" type="button" (click)="accept(r)" [disabled]="busy()">{{ 'friends.accept' | translate }}</button>
                  <button class="btn btn-ghost btn-sm" type="button" (click)="decline(r)" [disabled]="busy()">{{ 'friends.decline' | translate }}</button>
                </div>
              </div>
            }
          </div>
        </section>
      }

      <section>
        <div class="section-head"><span class="section-title">{{ 'friends.myFriends' | translate }}</span></div>
        @if (loading()) {
          <div class="loading"><div class="spinner"></div></div>
        } @else if (friends().length === 0) {
          <div class="card"><div class="empty">{{ 'friends.empty' | translate }}</div></div>
        } @else {
          <div class="card rows">
            @for (f of friends(); track f.userId) {
              <div class="row">
                @if (f.avatarUrl) {
                  <img class="fav" [src]="f.avatarUrl" alt="" />
                } @else {
                  <div [class]="avatarClass(f.userId)">{{ initials(f.displayName) }}</div>
                }
                <div class="row-main">
                  <div class="row-title">{{ f.displayName }}</div>
                  @if (f.handle) { <div class="row-sub">&#64;{{ f.handle }}</div> }
                </div>
                <button class="icon-btn" type="button" (click)="remove(f)" [disabled]="busy()" [attr.aria-label]="'friends.removeAria' | translate" [title]="'friends.removeAria' | translate">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
                </button>
              </div>
            }
          </div>
        }
      </section>

    </div>
  `,
})
export class Friends {
  private readonly auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);
  protected readonly avatarClass = avatarClass;
  protected readonly initials = initials;

  protected readonly friends = signal<Friend[]>([]);
  protected readonly requests = signal<Friend[]>([]);
  protected readonly loading = signal(true);
  protected readonly adding = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal('');

  protected query = '';

  constructor() {
    void this.load();
  }

  protected async add(): Promise<void> {
    const query = this.query.trim();
    if (!query) return;
    this.adding.set(true);
    this.error.set('');
    try {
      const result = await this.auth.addFriend(query);
      this.query = '';
      await this.load();
      this.toast.show(result.status === 'accepted' ? this.translate.instant('friends.toastNowFriends') : this.translate.instant('friends.toastRequestSent'));
    } catch (e) {
      const message = httpError(e);
      this.error.set(message);
      this.toast.show(message, 'err');
    } finally {
      this.adding.set(false);
    }
  }

  protected async remove(friend: Friend): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    try {
      await this.auth.removeFriend(friend.userId);
      this.friends.set(this.friends().filter(f => f.userId !== friend.userId));
      this.toast.show(this.translate.instant('friends.toastRemoved'));
    } catch (e) {
      const message = httpError(e);
      this.error.set(message);
      this.toast.show(message, 'err');
    } finally {
      this.busy.set(false);
    }
  }

  protected async accept(request: Friend): Promise<void> {
    this.busy.set(true);
    try {
      await this.auth.acceptFriendRequest(request.userId);
      await this.load();
      this.toast.show(this.translate.instant('friends.toastFriendAdded'));
    } catch (e) {
      this.toast.show(httpError(e), 'err');
    } finally {
      this.busy.set(false);
    }
  }

  protected async decline(request: Friend): Promise<void> {
    this.busy.set(true);
    try {
      await this.auth.declineFriendRequest(request.userId);
      this.requests.set(this.requests().filter(r => r.userId !== request.userId));
    } catch (e) {
      this.toast.show(httpError(e), 'err');
    } finally {
      this.busy.set(false);
    }
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const [friends, requests] = await Promise.all([
        this.auth.listFriends(),
        this.auth.listFriendRequests().catch(() => [] as Friend[]),
      ]);
      this.friends.set(friends);
      this.requests.set(requests);
    } catch (e) {
      this.error.set(httpError(e));
    } finally {
      this.loading.set(false);
    }
  }
}

import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { ToastService } from '../../services/toast.service';
import { Friend } from '../../models';
import { avatarClass, httpError, initials } from '../../format';

@Component({
  selector: 'app-friends',
  imports: [FormsModule, RouterLink],
  styles: [`
    .fav{width:40px;height:40px;border-radius:50%;object-fit:cover;flex:0 0 auto}
  `],
  template: `
    <div class="app">
      <header class="topbar">
        <div class="topbar-left">
          <a class="icon-btn" routerLink="/" aria-label="Назад">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </a>
          <div class="title-strong">Друзі</div>
        </div>
        <button class="icon-btn" type="button" (click)="theme.toggle()" aria-label="Змінити тему">
          @if (theme.effective() === 'dark') {
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2v2.5M12 19.5V22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M2 12h2.5M19.5 12H22M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/></svg>
          } @else {
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.3 6.3 0 0 0 10.5 10.5z"/></svg>
          }
        </button>
      </header>

      <section>
        <div class="section-head"><span class="section-title">Додати друга</span></div>
        <div class="card card-pad form-col">
          <div class="form-row">
            <input class="input" name="query" [(ngModel)]="query" placeholder="@логін або email" autocapitalize="off" autocomplete="off" (keyup.enter)="add()" />
            <button class="btn btn-primary" type="button" (click)="add()" [disabled]="adding() || !query.trim()">@if (adding()) { <span class="btn-spin"></span> } Додати</button>
          </div>
          <div class="row-sub">Контакт зберігається за акаунтом — навіть якщо людина змінить логін, він лишиться.</div>
          <div class="error">{{ error() }}</div>
        </div>
      </section>

      <section>
        <div class="section-head"><span class="section-title">Мої друзі</span></div>
        @if (loading()) {
          <div class="loading"><div class="spinner"></div></div>
        } @else if (friends().length === 0) {
          <div class="card"><div class="empty">Друзів ще немає. Додай когось за логіном 👆</div></div>
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
                <button class="icon-btn" type="button" (click)="remove(f)" [disabled]="busy()" aria-label="Прибрати з друзів" title="Прибрати">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
                </button>
              </div>
            }
          </div>
        }
      </section>

      <div class="foot">Skladka</div>
    </div>
  `,
})
export class Friends {
  private readonly auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);
  private readonly toast = inject(ToastService);
  protected readonly avatarClass = avatarClass;
  protected readonly initials = initials;

  protected readonly friends = signal<Friend[]>([]);
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
      await this.auth.addFriend(query);
      this.query = '';
      await this.load();
      this.toast.show('Друга додано');
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
      this.toast.show('Прибрано з друзів');
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
      this.friends.set(await this.auth.listFriends());
    } catch (e) {
      this.error.set(httpError(e));
    } finally {
      this.loading.set(false);
    }
  }
}

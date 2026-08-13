import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { httpError } from '../../format';

declare const google: {
  accounts: { id: {
    initialize(config: { client_id: string; callback: (r: { credential: string }) => void }): void;
    renderButton(el: HTMLElement, opts: Record<string, unknown>): void;
  } };
};

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  template: `
    <div class="auth-wrap">
      <div class="auth-card">
        <div class="auth-head">
          <div class="brand">Sk<b>lad</b>ka</div>
          <button class="icon-btn" type="button" (click)="theme.toggle()" aria-label="Змінити тему">
            @if (theme.effective() === 'dark') {
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2v2.5M12 19.5V22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M2 12h2.5M19.5 12H22M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/></svg>
            } @else {
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.3 6.3 0 0 0 10.5 10.5z"/></svg>
            }
          </button>
        </div>

        <h1 style="font-size:19px;font-weight:650;margin:0 0 16px">{{ mode() === 'login' ? 'Вхід' : 'Реєстрація' }}</h1>

        <form class="form-col" (ngSubmit)="submit()">
          <label class="field"><span>Email</span>
            <input class="input" type="email" name="email" [(ngModel)]="email" autocomplete="username" placeholder="you@example.com" />
          </label>
          <label class="field"><span>Пароль</span>
            <input class="input" type="password" name="password" [(ngModel)]="password" autocomplete="current-password" placeholder="мінімум 8: велика, мала, цифра" />
          </label>
          @if (mode() === 'register') {
            <div class="form-row">
              <label class="field"><span>Ім'я</span><input class="input" name="firstName" [(ngModel)]="firstName" /></label>
              <label class="field"><span>Прізвище</span><input class="input" name="lastName" [(ngModel)]="lastName" /></label>
            </div>
          }
          <button class="btn btn-primary btn-block" type="submit" [disabled]="loading()">
            {{ mode() === 'login' ? 'Увійти' : 'Зареєструватися' }}
          </button>
        </form>

        <div class="error" style="margin-top:8px">{{ error() }}</div>

        @if (googleReady()) { <div class="divider">або</div> }
        <div class="gbtn" #googleBtn></div>

        <div style="margin-top:14px;font-size:13px;color:var(--muted)">
          {{ mode() === 'login' ? 'Немає акаунта?' : 'Вже є акаунт?' }}
          <button class="link" type="button" (click)="toggleMode()">{{ mode() === 'login' ? 'Зареєструватися' : 'Увійти' }}</button>
        </div>
      </div>
    </div>
  `,
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly theme = inject(ThemeService);

  protected readonly mode = signal<'login' | 'register'>('login');
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly googleReady = signal(false);

  protected email = '';
  protected password = '';
  protected firstName = '';
  protected lastName = '';

  private readonly googleBtn = viewChild<ElementRef<HTMLElement>>('googleBtn');

  constructor() {
    if (this.auth.isAuthenticated()) {
      void this.router.navigate(['/']);
      return;
    }
    void this.initGoogle();
  }

  protected toggleMode(): void {
    this.mode.set(this.mode() === 'login' ? 'register' : 'login');
    this.error.set('');
  }

  protected async submit(): Promise<void> {
    this.error.set('');
    this.loading.set(true);
    try {
      if (this.mode() === 'login') {
        await this.auth.login(this.email.trim(), this.password);
      } else {
        await this.auth.register(this.email.trim(), this.password, this.firstName.trim(), this.lastName.trim());
      }
      await this.router.navigate(['/']);
    } catch (e) {
      this.error.set(httpError(e));
    } finally {
      this.loading.set(false);
    }
  }

  private async initGoogle(): Promise<void> {
    try {
      const clientId = await this.auth.googleClientId();
      if (!clientId) return;
      await loadScript('https://accounts.google.com/gsi/client');
      google.accounts.id.initialize({ client_id: clientId, callback: (r) => void this.onGoogle(r.credential) });
      const el = this.googleBtn()?.nativeElement;
      if (el) {
        google.accounts.id.renderButton(el, { theme: 'outline', size: 'large', width: 320, text: 'continue_with', locale: 'uk' });
        this.googleReady.set(true);
      }
    } catch {
      /* Google sign-in is optional */
    }
  }

  private async onGoogle(credential: string): Promise<void> {
    this.error.set('');
    this.loading.set(true);
    try {
      await this.auth.loginWithGoogle(credential);
      await this.router.navigate(['/']);
    } catch (e) {
      this.error.set(httpError(e));
    } finally {
      this.loading.set(false);
    }
  }
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('script load failed'));
    document.head.appendChild(s);
  });
}

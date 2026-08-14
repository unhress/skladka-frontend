import { ThemeSwitcher } from '../../components/theme-switcher';
import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { LanguageService } from '../../services/language.service';
import { httpError } from '../../format';

declare const google: {
  accounts: { id: {
    initialize(config: { client_id: string; callback: (r: { credential: string }) => void }): void;
    renderButton(el: HTMLElement, opts: Record<string, unknown>): void;
  } };
};

@Component({
  selector: 'app-login',
  imports: [ThemeSwitcher, FormsModule, TranslatePipe],
  template: `
    <div class="auth-wrap">
      <div class="auth-card">
        <div class="auth-head">
          <div class="brand">Sk<b>lad</b>ka</div>
          <app-theme-switcher />
        </div>

        <h1 style="font-size:20px;font-weight:650;letter-spacing:-.01em;margin:2px 0 18px">{{ (mode() === 'login' ? 'login.signIn' : 'login.register') | translate }}</h1>

        <form class="form-col" (ngSubmit)="submit()">
          <input class="input" type="email" name="email" [(ngModel)]="email" autocomplete="username" [placeholder]="'login.email' | translate" />
          <input class="input" type="password" name="password" [(ngModel)]="password" [autocomplete]="mode() === 'login' ? 'current-password' : 'new-password'" [placeholder]="'login.password' | translate" />
          @if (mode() === 'register') {
            <div class="form-row">
              <input class="input" name="firstName" [(ngModel)]="firstName" [placeholder]="'login.firstName' | translate" />
              <input class="input" name="lastName" [(ngModel)]="lastName" [placeholder]="'login.lastName' | translate" />
            </div>
            <div class="row-sub" style="margin-top:-4px">{{ 'login.passwordHint' | translate }}</div>
          }
          <button class="btn btn-primary btn-block btn-lg" type="submit" [disabled]="loading()">
            @if (loading()) { <span class="btn-spin"></span> } {{ (mode() === 'login' ? 'login.enter' : 'login.doRegister') | translate }}
          </button>
        </form>

        <div class="error" style="margin-top:8px">{{ error() }}</div>

        @if (googleReady()) { <div class="divider">{{ 'common.or' | translate }}</div> }
        <div class="gbtn" #googleBtn></div>

        <div style="margin-top:16px;font-size:13px;color:var(--muted);text-align:center">
          {{ (mode() === 'login' ? 'login.noAccount' : 'login.haveAccount') | translate }}
          <button class="link" type="button" (click)="toggleMode()">{{ (mode() === 'login' ? 'login.doRegister' : 'login.enter') | translate }}</button>
        </div>
      </div>
    </div>
  `,
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly theme = inject(ThemeService);
  private readonly lang = inject(LanguageService);

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
      void this.redirect();
      return;
    }
    void this.initGoogle();
  }

  private redirect(): Promise<boolean> {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/';
    return this.router.navigateByUrl(returnUrl);
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
      await this.redirect();
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
        const width = Math.min(360, Math.round(el.clientWidth)) || 320;
        const buttonTheme = this.theme.effective() === 'dark' ? 'filled_black' : 'outline';
        google.accounts.id.renderButton(el, { theme: buttonTheme, size: 'large', shape: 'pill', text: 'continue_with', width, locale: this.lang.current() === 'en' ? 'en' : 'uk' });
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
      await this.redirect();
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

import { ThemeSwitcher } from '../../components/theme-switcher';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { ToastService } from '../../services/toast.service';
import { LanguageService } from '../../services/language.service';
import { Flag } from '../../components/flag';
import { httpError, initials } from '../../format';
import { ImageCropper } from '../../components/image-cropper';

@Component({
  selector: 'app-profile',
  imports: [ThemeSwitcher, FormsModule, RouterLink, ImageCropper, TranslatePipe, Flag],
  styles: [`
    .avatar-lg{width:68px;height:68px;border-radius:50%;object-fit:cover;border:1px solid var(--line);display:flex;align-items:center;justify-content:center;font-size:23px;font-weight:650;background:var(--surface-2);color:var(--muted);overflow:hidden;flex:0 0 auto}
    .lang-list{display:flex;flex-direction:column;gap:2px}
    .lang-item{display:flex;align-items:center;gap:11px;width:100%;padding:10px 11px;border:1px solid transparent;border-radius:12px;background:var(--surface-2);color:var(--ink);font:inherit;font-size:14px;font-weight:540;cursor:pointer;text-align:left}
    .lang-item.on{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 12%,var(--surface-2))}
    .lang-item .lang-check{margin-left:auto;color:var(--accent)}
  `],
  template: `
    <div class="app">
      <header class="topbar">
        <div class="topbar-left">
          <a class="icon-btn" routerLink="/" [attr.aria-label]="'nav.back' | translate">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </a>
          <div class="title-strong">{{ 'profile.title' | translate }}</div>
        </div>
        <app-theme-switcher />
      </header>

      @if (loading()) {
        <div class="loading"><div class="spinner"></div></div>
      } @else {
        <div class="card card-pad form-col">
          <div style="display:flex;align-items:center;gap:14px">
            @if (avatarUrl()) {
              <img class="avatar-lg" [src]="avatarUrl()" alt="Аватар" />
            } @else {
              <div class="avatar-lg">{{ initials(displayName()) }}</div>
            }
            <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-start">
              <button class="btn btn-ghost btn-sm" type="button" (click)="fileInput.click()" [disabled]="avatarBusy()">
                @if (avatarBusy()) { <span class="btn-spin"></span> } {{ (avatarUrl() ? 'profile.changePhoto' : 'profile.addPhoto') | translate }}
              </button>
              @if (avatarUrl()) {
                <button class="link" type="button" (click)="removeAvatar()" [disabled]="avatarBusy()">{{ 'profile.removePhoto' | translate }}</button>
              }
            </div>
            <input #fileInput type="file" accept="image/*" hidden (change)="onFile($event)" />
          </div>

          <div class="form-row">
            <label class="field"><span>{{ 'profile.firstName' | translate }}</span><input class="input" name="firstName" [(ngModel)]="firstName" /></label>
            <label class="field"><span>{{ 'profile.lastName' | translate }}</span><input class="input" name="lastName" [(ngModel)]="lastName" /></label>
          </div>
          <label class="field">
            <span>{{ 'profile.handle' | translate }}</span>
            <input class="input" name="handle" [(ngModel)]="handle" autocapitalize="off" autocomplete="off" spellcheck="false" />
          </label>
          <div class="row-sub">{{ 'profile.email' | translate:{ email: email() } }}</div>
          <button class="btn btn-primary" type="button" (click)="save()" [disabled]="saving()">
            @if (saving()) { <span class="btn-spin"></span> } {{ 'profile.save' | translate }}
          </button>
          <div class="error">{{ error() }}</div>
        </div>

        <div class="card card-pad form-col">
          <div class="section-title">{{ 'profile.language' | translate }}</div>
          <div class="lang-list">
            @for (l of lang.languages; track l.code) {
              <button type="button" class="lang-item" [class.on]="lang.current() === l.code" (click)="lang.use(l.code)">
                <app-flag [emoji]="l.emoji" [custom]="l.custom ?? null" [ariaLabel]="l.label" />
                <span>{{ l.label }}</span>
                @if (lang.current() === l.code) {
                  <svg class="lang-check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                }
              </button>
            }
          </div>
        </div>

        <button class="link" type="button" (click)="logout()" style="align-self:center;margin-top:2px">{{ 'profile.logout' | translate }}</button>
      }
    </div>
    @if (cropFile(); as f) {
      <app-image-cropper [file]="f" [outputSize]="512" (cropped)="onCropped($event)" (cancelled)="cropFile.set(null)" />
    }
  `,
})
export class Profile {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly theme = inject(ThemeService);
  protected readonly lang = inject(LanguageService);
  private readonly translate = inject(TranslateService);
  private readonly toast = inject(ToastService);
  protected readonly initials = initials;

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly avatarBusy = signal(false);
  protected readonly error = signal('');
  protected readonly email = signal('');
  protected readonly avatarUrl = signal<string | null>(null);
  protected readonly cropFile = signal<File | null>(null);

  protected firstName = '';
  protected lastName = '';
  protected handle = '';

  constructor() {
    void this.load();
  }

  protected displayName(): string {
    return [this.firstName, this.lastName].filter(Boolean).join(' ') || this.email();
  }

  protected onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) this.cropFile.set(file);
  }

  protected async onCropped(dataUrl: string): Promise<void> {
    this.cropFile.set(null);
    this.avatarBusy.set(true);
    this.error.set('');
    try {
      const profile = await this.auth.uploadAvatar(dataUrl);
      this.avatarUrl.set(profile.avatarUrl ?? null);
      this.toast.show(this.translate.instant('profile.photoUpdated'));
    } catch (e) {
      const message = httpError(e);
      this.error.set(message);
      this.toast.show(message, 'err');
    } finally {
      this.avatarBusy.set(false);
    }
  }

  protected async removeAvatar(): Promise<void> {
    this.avatarBusy.set(true);
    this.error.set('');
    try {
      const profile = await this.auth.deleteAvatar();
      this.avatarUrl.set(profile.avatarUrl ?? null);
      this.toast.show(this.translate.instant('profile.photoRemoved'));
    } catch (e) {
      const message = httpError(e);
      this.error.set(message);
      this.toast.show(message, 'err');
    } finally {
      this.avatarBusy.set(false);
    }
  }

  protected async save(): Promise<void> {
    this.saving.set(true);
    this.error.set('');
    try {
      await this.auth.updateProfile({
        firstName: this.firstName.trim(),
        lastName: this.lastName.trim(),
        handle: this.handle.trim(),
      });
      this.toast.show(this.translate.instant('profile.saved'));
    } catch (e) {
      const message = httpError(e);
      this.error.set(message);
      this.toast.show(message, 'err');
    } finally {
      this.saving.set(false);
    }
  }

  protected logout(): void {
    this.auth.logout();
    void this.router.navigate(['/login']);
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const profile = await this.auth.getProfile();
      this.firstName = profile.firstName ?? '';
      this.lastName = profile.lastName ?? '';
      this.handle = profile.handle ?? '';
      this.email.set(profile.email);
      this.avatarUrl.set(profile.avatarUrl ?? null);
    } catch (e) {
      this.error.set(httpError(e));
    } finally {
      this.loading.set(false);
    }
  }
}

import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { ToastService } from '../../services/toast.service';
import { httpError, initials } from '../../format';
import { downscaleImage } from '../../image.util';

@Component({
  selector: 'app-profile',
  imports: [FormsModule, RouterLink],
  styles: [`
    .avatar-lg{width:68px;height:68px;border-radius:50%;object-fit:cover;border:1px solid var(--line);display:flex;align-items:center;justify-content:center;font-size:23px;font-weight:650;background:var(--surface-2);color:var(--muted);overflow:hidden;flex:0 0 auto}
  `],
  template: `
    <div class="app">
      <header class="topbar">
        <div class="topbar-left">
          <a class="icon-btn" routerLink="/" aria-label="Назад">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </a>
          <div class="title-strong">Профіль</div>
        </div>
        <button class="icon-btn" type="button" (click)="theme.toggle()" aria-label="Змінити тему">
          @if (theme.effective() === 'dark') {
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2v2.5M12 19.5V22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M2 12h2.5M19.5 12H22M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/></svg>
          } @else {
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.3 6.3 0 0 0 10.5 10.5z"/></svg>
          }
        </button>
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
                @if (avatarBusy()) { <span class="btn-spin"></span> } {{ avatarUrl() ? 'Змінити фото' : 'Додати фото' }}
              </button>
              @if (avatarUrl()) {
                <button class="link" type="button" (click)="removeAvatar()" [disabled]="avatarBusy()">Прибрати фото</button>
              }
            </div>
            <input #fileInput type="file" accept="image/*" hidden (change)="onFile($event)" />
          </div>

          <div class="form-row">
            <label class="field"><span>Ім'я</span><input class="input" name="firstName" [(ngModel)]="firstName" /></label>
            <label class="field"><span>Прізвище</span><input class="input" name="lastName" [(ngModel)]="lastName" /></label>
          </div>
          <label class="field">
            <span>Логін — за ним тебе додають у групи</span>
            <input class="input" name="handle" [(ngModel)]="handle" placeholder="напр. dmytro" autocapitalize="off" autocomplete="off" />
          </label>
          <div class="row-sub">Email: {{ email() }}</div>
          <button class="btn btn-primary" type="button" (click)="save()" [disabled]="saving()">
            @if (saving()) { <span class="btn-spin"></span> } Зберегти
          </button>
          <div class="error">{{ error() }}</div>
        </div>
        <button class="link" type="button" (click)="logout()" style="align-self:center;margin-top:2px">Вийти</button>
      }
    </div>
  `,
})
export class Profile {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly theme = inject(ThemeService);
  private readonly toast = inject(ToastService);
  protected readonly initials = initials;

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly avatarBusy = signal(false);
  protected readonly error = signal('');
  protected readonly email = signal('');
  protected readonly avatarUrl = signal<string | null>(null);

  protected firstName = '';
  protected lastName = '';
  protected handle = '';

  constructor() {
    void this.load();
  }

  protected displayName(): string {
    return [this.firstName, this.lastName].filter(Boolean).join(' ') || this.email();
  }

  protected async onFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    this.avatarBusy.set(true);
    this.error.set('');
    try {
      const { dataUrl } = await downscaleImage(file, { maxSize: 512, quality: 0.85, square: true });
      const profile = await this.auth.uploadAvatar(dataUrl);
      this.avatarUrl.set(profile.avatarUrl ?? null);
      this.toast.show('Фото оновлено');
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
      this.toast.show('Фото прибрано');
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
      this.toast.show('Профіль збережено');
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

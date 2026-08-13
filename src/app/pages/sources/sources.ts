import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ExpensesService } from '../../services/expenses.service';
import { ThemeService } from '../../services/theme.service';
import { ToastService } from '../../services/toast.service';
import { SourceResponse } from '../../models';
import { avatarClass, httpError, initials } from '../../format';
import { downscaleImage } from '../../image.util';

const CATEGORIES = ['Продукти', 'Пальне', 'Аптека', 'Кафе', 'Маркетплейс', 'Техніка', "Зв'язок", 'Транспорт', 'Доставка', 'Розваги', 'Інше'];

@Component({
  selector: 'app-sources',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="app">
      <header class="topbar">
        <div class="topbar-left">
          <a class="icon-btn" routerLink="/" aria-label="Назад">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </a>
          <div class="title-strong">Джерела</div>
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
        <div class="section-head"><span class="section-title">Додати своє джерело</span></div>
        <div class="card card-pad form-col">
          <div class="form-row">
            <input class="input" name="name" [(ngModel)]="name" placeholder="Назва (напр. Ринок)" style="flex:1.6" />
            <select class="input" name="category" [(ngModel)]="category" aria-label="Категорія">
              @for (c of categories; track c) { <option [value]="c">{{ c }}</option> }
            </select>
          </div>
          <button class="btn btn-primary" type="button" (click)="add()" [disabled]="busy() || !name.trim()">@if (busy()) { <span class="btn-spin"></span> } Додати</button>
          <div class="error">{{ error() }}</div>
        </div>
      </section>

      <section>
        <div class="section-head"><span class="section-title">Усі джерела</span></div>
        @if (loading()) {
          <div class="loading"><div class="spinner"></div></div>
        } @else {
          <input type="file" accept="image/*" hidden (change)="onIcon($event)" #iconInput />
          <div class="card rows">
            @for (s of sources(); track s.id) {
              <div class="row">
                @if (s.iconUrl) {
                  <img [src]="s.iconUrl" alt="" style="width:36px;height:36px;border-radius:9px;object-fit:cover;flex:0 0 auto" />
                } @else if (!iconFailed().has(s.slug)) {
                  <img [src]="'assets/merchants/' + s.slug + '.png'" (error)="markIconFailed(s.slug)" alt="" style="width:36px;height:36px;border-radius:9px;object-fit:contain;flex:0 0 auto" />
                } @else {
                  <div [class]="avatarClass(s.slug)">{{ initials(s.name) }}</div>
                }
                <div class="row-main">
                  <div class="row-title">{{ s.name }}</div>
                  <div class="row-sub">{{ s.category }}@if (!s.isGlobal) { · власне }</div>
                </div>
                <div style="display:flex;align-items:center;gap:2px">
                  <button class="icon-btn" type="button" (click)="toggleFav(s)" [disabled]="busy()" [attr.aria-label]="s.isFavorite ? 'Прибрати з обраного' : 'В обране'">
                    <svg width="17" height="17" viewBox="0 0 24 24" [attr.fill]="s.isFavorite ? 'var(--accent)' : 'none'" [attr.stroke]="s.isFavorite ? 'var(--accent)' : 'var(--faint)'" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                  </button>
                  @if (!s.isGlobal) {
                    <button class="icon-btn" type="button" (click)="pickIcon(s)" [disabled]="busy()" aria-label="Іконка" title="Змінити іконку">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                    </button>
                    <button class="icon-btn" type="button" (click)="remove(s)" [disabled]="busy()" aria-label="Видалити">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
                    </button>
                  }
                </div>
              </div>
            }
          </div>
        }
      </section>

      <div class="foot">⭐ обране піднімається вгору списку у виборі «Джерело»</div>
    </div>
  `,
})
export class Sources {
  private readonly api = inject(ExpensesService);
  protected readonly theme = inject(ThemeService);
  private readonly toast = inject(ToastService);
  protected readonly avatarClass = avatarClass;
  protected readonly initials = initials;
  protected readonly categories = CATEGORIES;

  protected readonly sources = signal<SourceResponse[]>([]);
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly iconFailed = signal<Set<string>>(new Set<string>());

  protected name = '';
  protected category = CATEGORIES[0];
  private pendingIconId: string | null = null;

  constructor() {
    void this.load();
  }

  protected async add(): Promise<void> {
    const name = this.name.trim();
    if (!name) return;
    this.busy.set(true);
    this.error.set('');
    try {
      await this.api.createSource(name, this.category);
      this.name = '';
      await this.load();
      this.toast.show('Джерело додано');
    } catch (e) {
      const message = httpError(e);
      this.error.set(message);
      this.toast.show(message, 'err');
    } finally {
      this.busy.set(false);
    }
  }

  protected async toggleFav(s: SourceResponse): Promise<void> {
    this.busy.set(true);
    try {
      await this.api.setSourceFavorite(s.id, !s.isFavorite);
      await this.load();
    } catch (e) {
      this.toast.show(httpError(e), 'err');
    } finally {
      this.busy.set(false);
    }
  }

  protected async remove(s: SourceResponse): Promise<void> {
    this.busy.set(true);
    try {
      await this.api.deleteSource(s.id);
      this.sources.set(this.sources().filter(x => x.id !== s.id));
      this.toast.show('Джерело видалено');
    } catch (e) {
      this.toast.show(httpError(e), 'err');
    } finally {
      this.busy.set(false);
    }
  }

  protected pickIcon(s: SourceResponse): void {
    this.pendingIconId = s.id;
    const input = document.querySelector<HTMLInputElement>('input[type=file]');
    input?.click();
  }

  protected async onIcon(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    const id = this.pendingIconId;
    this.pendingIconId = null;
    if (!file || !id) return;

    this.busy.set(true);
    try {
      const { dataUrl } = await downscaleImage(file, { maxSize: 256, quality: 0.85, square: true });
      await this.api.uploadSourceIcon(id, dataUrl);
      await this.load();
      this.toast.show('Іконку оновлено');
    } catch (e) {
      this.toast.show(httpError(e), 'err');
    } finally {
      this.busy.set(false);
    }
  }

  protected markIconFailed(slug: string): void {
    const next = new Set(this.iconFailed());
    next.add(slug);
    this.iconFailed.set(next);
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      this.sources.set(await this.api.listSources());
    } catch (e) {
      this.error.set(httpError(e));
    } finally {
      this.loading.set(false);
    }
  }
}

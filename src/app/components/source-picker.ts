import { Component, computed, effect, inject, input, model, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { SourceResponse } from '../models';
import { fuzzyMatch } from '../search.util';

/** Source field with type-ahead search and a way to propose a missing source. */
@Component({
  selector: 'app-source-picker',
  imports: [TranslatePipe],
  template: `
    <div style="position:relative">
      <div style="display:flex;align-items:center;gap:6px">
        <input class="input" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" style="flex:1"
          [value]="query()" (input)="onInput($any($event.target).value)" (focus)="open.set(true)" (blur)="onBlur()"
          [placeholder]="'group.sourcePlaceholder' | translate" [attr.aria-label]="'group.source' | translate" />
        @if (value()) {
          <button class="icon-btn" type="button" (click)="clear()" [attr.aria-label]="'group.clearAria' | translate">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        }
      </div>
      @if (open() && (matches().length || query().trim())) {
        <div class="card rows" style="position:absolute;left:0;right:0;top:100%;z-index:30;max-height:260px;overflow:auto;margin-top:4px;box-shadow:var(--shadow-hero);background:var(--surface);-webkit-backdrop-filter:none;backdrop-filter:none">
          @for (s of matches(); track s.id) {
            <div class="row" style="cursor:pointer" (mousedown)="pick(s)">
              <div class="row-main"><div class="row-title">{{ s.name }}</div><div class="row-sub">{{ s.category }}</div></div>
              @if (s.isFavorite) {
                <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--accent)" stroke="var(--accent)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              }
            </div>
          }
          @if (query().trim()) {
            <div class="row" style="cursor:pointer;background:var(--accent-soft)" (mousedown)="propose()">
              <div class="row-main">
                <div class="row-title" style="color:var(--accent-ink)">{{ 'group.addOwnSource' | translate:{ name: query().trim() } }}</div>
                <div class="row-sub" style="color:var(--accent-ink);opacity:.85">{{ 'group.addOwnSourceHint' | translate }}</div>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class SourcePicker {
  private readonly router = inject(Router);

  readonly sources = input.required<SourceResponse[]>();
  readonly value = model<string>('');

  protected readonly query = signal('');
  protected readonly open = signal(false);

  protected readonly matches = computed(() => {
    const q = this.query().trim();
    const list = [...this.sources()].sort(
      (a, b) => Number(b.isFavorite) - Number(a.isFavorite) || a.name.localeCompare(b.name, 'uk'));
    const selected = this.sources().find(s => s.id === this.value());
    const filtered = q && q !== selected?.name ? list.filter(s => fuzzyMatch(q, s.name, s.slug, s.category)) : list;
    return filtered.slice(0, 40);
  });

  constructor() {
    effect(() => {
      const selected = this.sources().find(s => s.id === this.value());
      this.query.set(selected?.name ?? '');
    });
  }

  protected onInput(text: string): void {
    this.query.set(text);
    this.value.set('');
    this.open.set(true);
  }

  protected pick(source: SourceResponse): void {
    this.value.set(source.id);
    this.query.set(source.name);
    this.open.set(false);
  }

  protected clear(): void {
    this.value.set('');
    this.query.set('');
    this.open.set(false);
  }

  protected onBlur(): void {
    setTimeout(() => this.open.set(false), 150);
  }

  protected propose(): void {
    this.open.set(false);
    void this.router.navigate(['/sources'], { queryParams: { propose: this.query().trim() } });
  }
}

import { Component, computed, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { EMOJI_CATEGORIES } from './emoji-data';

@Component({
  selector: 'app-emoji-picker',
  imports: [FormsModule, TranslatePipe],
  styles: [`
    .ep-sheet{max-width:440px}
    .ep-tabs{display:flex;gap:2px;overflow-x:auto;padding:2px 0 8px;scrollbar-width:none}
    .ep-tabs::-webkit-scrollbar{display:none}
    .ep-tab{flex:0 0 auto;width:38px;height:38px;border-radius:10px;border:0;background:transparent;font-size:20px;line-height:1;cursor:pointer;display:grid;place-items:center;opacity:.7}
    .ep-tab.on{background:var(--surface-2);opacity:1}
    .ep-scroll{max-height:min(48vh,340px);overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}
    .ep-cat{font-size:12px;color:var(--muted);margin:8px 2px 4px;text-transform:uppercase;letter-spacing:.04em}
    .ep-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(38px,1fr));gap:2px}
    .ep-cell{aspect-ratio:1;border:0;background:transparent;font-size:23px;line-height:1;border-radius:9px;cursor:pointer;display:grid;place-items:center}
    .ep-cell:hover{background:var(--surface-2)}
    .ep-empty{color:var(--muted);font-size:13px;padding:16px 2px}
  `],
  template: `
    <div class="scrim" (click)="cancelled.emit()">
      <div class="sheet ep-sheet" (click)="$event.stopPropagation()">
        <div class="sheet-head">
          <div class="sheet-title">{{ 'emoji.title' | translate }}</div>
          <button class="icon-btn" type="button" (click)="cancelled.emit()" [attr.aria-label]="'common.close' | translate"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
        </div>

        <input class="input" [ngModel]="query()" (ngModelChange)="query.set($event)" name="emojiSearch" [placeholder]="'emoji.search' | translate" autocomplete="off" autocapitalize="off" spellcheck="false" style="margin-bottom:6px" />

        @if (!query().trim()) {
          <div class="ep-tabs">
            @for (c of categories; track c.key) {
              <button type="button" class="ep-tab" [class.on]="active() === c.key" (click)="active.set(c.key)" [title]="c.label | translate">{{ c.icon }}</button>
            }
          </div>
        }

        <div class="ep-scroll">
          @if (query().trim()) {
            @if (results().length) {
              <div class="ep-grid">
                @for (e of results(); track e) {
                  <button type="button" class="ep-cell" (click)="picked.emit(e)">{{ e }}</button>
                }
              </div>
            } @else {
              <div class="ep-empty">{{ 'emoji.noResults' | translate }}</div>
            }
          } @else {
            <div class="ep-cat">{{ activeCategory().label | translate }}</div>
            <div class="ep-grid">
              @for (e of activeCategory().list; track e) {
                <button type="button" class="ep-cell" (click)="picked.emit(e)">{{ e }}</button>
              }
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class EmojiPicker {
  protected readonly categories = EMOJI_CATEGORIES;
  protected readonly active = signal(EMOJI_CATEGORIES[0].key);
  protected readonly query = signal('');

  readonly picked = output<string>();
  readonly cancelled = output<void>();

  protected readonly activeCategory = computed(() =>
    this.categories.find(c => c.key === this.active()) ?? this.categories[0]);

  // Search matches against each emoji's English keywords (see emoji-data).
  protected readonly results = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return [];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const c of this.categories) {
      for (const e of c.list) {
        if (seen.has(e)) continue;
        const kw = c.keywords[e];
        if (kw && kw.includes(q)) { seen.add(e); out.push(e); }
      }
    }
    return out;
  });
}

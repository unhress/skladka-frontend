import {
  afterNextRender, ChangeDetectionStrategy, Component, computed, ElementRef,
  inject, input, model, OnDestroy, signal, viewChild,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageService } from '../services/language.service';

const pad = (n: number) => String(n).padStart(2, '0');
const toIso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

interface Cell { iso: string; day: number; inMonth: boolean; disabled: boolean; }

/**
 * A date field in the app's own style: a form-like button that opens a calendar popup.
 * Value is an ISO date string (YYYY-MM-DD). Like <app-glass-select>, the popup is teleported
 * to <body> and positioned `fixed`, because glass cards (backdrop-filter) would otherwise
 * become the containing block and offset it.
 */
@Component({
  selector: 'app-date-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe],
  styles: [`
    :host{display:block}
    .dp-btn{width:100%;height:44px;padding:0 13px;border:1px solid var(--line-strong);border-radius:12px;
      background:var(--surface);color:var(--ink);font:inherit;cursor:pointer;display:flex;align-items:center;gap:10px;text-align:left}
    .dp-btn:focus-visible{outline:2px solid color-mix(in srgb,var(--accent) 45%,transparent);outline-offset:-1px;border-color:var(--accent)}
    .dp-btn svg{color:var(--muted);flex:0 0 auto}
    .dp-txt{flex:1;min-width:0}

    .dp-overlay{display:none}
    .dp-overlay.open{display:block}
    .dp-backdrop{position:fixed;inset:0;z-index:2000}
    .dp-pop{position:fixed;z-index:2001;width:296px;padding:12px;background:var(--surface);border:1px solid var(--glass-brd);
      border-radius:16px;box-shadow:var(--shadow-hero);color:var(--ink);animation:dpIn .15s ease}
    .dp-head{display:flex;align-items:center;gap:4px;margin-bottom:8px}
    .dp-title{flex:1;text-align:center;font-weight:650;font-size:14.5px;text-transform:capitalize}
    .dp-nav{width:32px;height:32px;border:0;border-radius:10px;background:none;color:var(--muted);cursor:pointer;display:grid;place-items:center}
    .dp-nav:hover:not(:disabled){background:var(--surface-2);color:var(--ink)}
    .dp-nav:disabled{opacity:.35;cursor:default}
    .dp-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:2px}
    .dp-dow{text-align:center;font-size:11.5px;font-weight:600;color:var(--faint);padding:4px 0;text-transform:capitalize}
    .dp-day{height:36px;border:0;border-radius:10px;background:none;color:var(--ink);font:inherit;font-size:13.5px;font-weight:540;cursor:pointer}
    .dp-day:hover:not(:disabled):not(.sel){background:var(--surface-2)}
    .dp-day.out{color:var(--faint)}
    .dp-day.today:not(.sel){box-shadow:inset 0 0 0 1.5px color-mix(in srgb,var(--accent) 55%,transparent)}
    .dp-day.sel{background:var(--accent);color:var(--accent-ink);font-weight:700}
    .dp-day:disabled{opacity:.3;cursor:default}
    .dp-foot{display:flex;justify-content:space-between;margin-top:8px;padding-top:8px;border-top:1px solid var(--glass-brd)}
    .dp-link{border:0;background:none;color:var(--accent);font:inherit;font-size:13.5px;font-weight:600;cursor:pointer;padding:6px 8px;border-radius:8px}
    .dp-link:hover{background:var(--surface-2)}
    @keyframes dpIn{from{opacity:0;transform:translateY(-4px)}}
  `],
  template: `
    <button #trigger class="dp-btn" type="button" [attr.aria-label]="ariaLabel()" (click)="toggle()">
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>
      <span class="dp-txt">{{ label() }}</span>
    </button>

    <div #overlay class="dp-overlay" [class.open]="open()">
      <div class="dp-backdrop" (click)="close()"></div>
      <div class="dp-pop" role="dialog" [style.top.px]="pos()?.top" [style.left.px]="pos()?.left">
        <div class="dp-head">
          <button class="dp-nav" type="button" (click)="shift(-1)" [attr.aria-label]="'common.back' | translate">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>
          </button>
          <div class="dp-title">{{ monthTitle() }}</div>
          <button class="dp-nav" type="button" (click)="shift(1)" [disabled]="nextDisabled()" aria-label="Next month">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>
          </button>
        </div>
        <div class="dp-grid">
          @for (w of weekdays(); track $index) { <div class="dp-dow">{{ w }}</div> }
          @for (c of cells(); track c.iso) {
            <button class="dp-day" type="button" [class.out]="!c.inMonth" [class.sel]="c.iso === value()" [class.today]="c.iso === todayIso()"
                    [disabled]="c.disabled" (click)="pick(c.iso)">{{ c.day }}</button>
          }
        </div>
        <div class="dp-foot">
          <button class="dp-link" type="button" (click)="pick(todayIso())" [disabled]="isFuture(todayIso())">{{ 'group.today' | translate }}</button>
        </div>
      </div>
    </div>
  `,
})
export class DatePicker implements OnDestroy {
  /** ISO date (YYYY-MM-DD). */
  readonly value = model.required<string>();
  /** Latest selectable ISO date; later days are disabled. */
  readonly max = input<string | null>(null);
  readonly ariaLabel = input<string | null>(null);

  private readonly lang = inject(LanguageService);
  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');
  private readonly overlay = viewChild.required<ElementRef<HTMLElement>>('overlay');

  protected readonly open = signal(false);
  protected readonly pos = signal<{ top: number; left: number } | null>(null);
  /** First day of the month being displayed. */
  private readonly view = signal<{ y: number; m: number }>({ y: new Date().getFullYear(), m: new Date().getMonth() });

  private readonly onDismiss = () => this.close();

  /** Intl has no Crimean Tatar data in most browsers; fall back to Ukrainian names for it. */
  private readonly locale = computed(() => (this.lang.current() === 'crh' ? 'uk' : this.lang.current()));

  protected readonly todayIso = signal(this.nowIso());

  protected readonly label = computed(() => {
    const d = this.parse(this.value());
    if (!d) return '';
    return new Intl.DateTimeFormat(this.locale(), { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
  });

  protected readonly monthTitle = computed(() => {
    const { y, m } = this.view();
    return new Intl.DateTimeFormat(this.locale(), { month: 'long', year: 'numeric' }).format(new Date(y, m, 1));
  });

  protected readonly weekdays = computed(() => {
    const f = new Intl.DateTimeFormat(this.locale(), { weekday: 'short' });
    // 2024-01-01 is a Monday; the grid starts on Monday.
    return Array.from({ length: 7 }, (_, i) => f.format(new Date(2024, 0, 1 + i)));
  });

  protected readonly cells = computed<Cell[]>(() => {
    const { y, m } = this.view();
    const lead = (new Date(y, m, 1).getDay() + 6) % 7; // Monday-based offset
    const max = this.max();
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(y, m, 1 - lead + i);
      const iso = toIso(d.getFullYear(), d.getMonth(), d.getDate());
      return { iso, day: d.getDate(), inMonth: d.getMonth() === m, disabled: !!max && iso > max };
    });
  });

  protected readonly nextDisabled = computed(() => {
    const max = this.max();
    if (!max) return false;
    const { y, m } = this.view();
    return toIso(m === 11 ? y + 1 : y, (m + 1) % 12, 1) > max;
  });

  constructor() {
    afterNextRender(() => document.body.appendChild(this.overlay().nativeElement));
  }

  protected isFuture(iso: string): boolean {
    const max = this.max();
    return !!max && iso > max;
  }

  protected toggle(): void {
    if (this.open()) {
      this.close();
      return;
    }
    const d = this.parse(this.value()) ?? new Date();
    this.view.set({ y: d.getFullYear(), m: d.getMonth() });
    this.todayIso.set(this.nowIso());
    this.reposition();
    this.open.set(true);
    document.body.style.overflow = 'hidden';
    window.addEventListener('resize', this.onDismiss);
  }

  protected close(): void {
    if (!this.open()) return;
    this.open.set(false);
    document.body.style.overflow = '';
    window.removeEventListener('resize', this.onDismiss);
  }

  protected shift(delta: number): void {
    const { y, m } = this.view();
    const d = new Date(y, m + delta, 1);
    this.view.set({ y: d.getFullYear(), m: d.getMonth() });
  }

  protected pick(iso: string): void {
    if (this.isFuture(iso)) return;
    this.value.set(iso);
    this.close();
  }

  private reposition(): void {
    const r = this.trigger().nativeElement.getBoundingClientRect();
    const width = 296;
    const popHeight = 372;
    const left = Math.max(8, Math.min(Math.round(r.left), window.innerWidth - width - 8));
    // Open upwards when there is no room below (the form sheet sits near the bottom on phones).
    const below = Math.round(r.bottom + 5);
    const top = below + popHeight > window.innerHeight ? Math.max(8, Math.round(r.top - popHeight - 5)) : below;
    this.pos.set({ top, left });
  }

  private parse(iso: string): Date | null {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');
    return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
  }

  private nowIso(): string {
    const d = new Date();
    return toIso(d.getFullYear(), d.getMonth(), d.getDate());
  }

  ngOnDestroy(): void {
    if (this.open()) {
      document.body.style.overflow = '';
    }
    window.removeEventListener('resize', this.onDismiss);
    this.overlay().nativeElement.remove();
  }
}

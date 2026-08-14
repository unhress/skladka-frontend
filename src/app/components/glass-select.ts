import { ChangeDetectionStrategy, Component, computed, input, model, signal } from '@angular/core';

export interface SelectOption {
  value: string;
  label: string;
  /** Optional short badge (e.g. a currency symbol) shown in the button and as a chip in the menu. */
  short?: string;
}

/** A glass-styled dropdown that looks like a form field but opens a frosted menu. */
@Component({
  selector: 'app-glass-select',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    :host{display:block}
    .gs{position:relative;width:100%}
    .gs-btn{width:100%;height:44px;padding:0 13px;border:1px solid var(--line-strong);border-radius:12px;
      background:var(--surface);color:var(--ink);font:inherit;cursor:pointer;display:flex;align-items:center;gap:8px;text-align:left}
    .gs-btn:focus-visible{outline:2px solid color-mix(in srgb,var(--accent) 45%,transparent);outline-offset:-1px;border-color:var(--accent)}
    .gs-badge{min-width:24px;height:24px;padding:0 6px;border-radius:7px;background:var(--surface-2);border:1px solid var(--glass-brd);
      display:inline-flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;flex:0 0 auto}
    .gs-txt{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .gs-caret{margin-left:auto;color:var(--muted);flex:0 0 auto;transition:transform .15s}
    .gs-caret.up{transform:rotate(180deg)}
    .gs-backdrop{position:fixed;inset:0;z-index:1000}
    .gs-menu{position:fixed;z-index:1001;max-height:280px;overflow:auto;padding:6px;
      background:var(--sheen),var(--glass);border:1px solid var(--glass-brd);border-radius:14px;box-shadow:var(--shadow-hero);
      -webkit-backdrop-filter:var(--blur);backdrop-filter:var(--blur);display:flex;flex-direction:column;gap:2px;animation:gsIn .15s ease}
    .gs-item{display:flex;align-items:center;gap:10px;width:100%;padding:9px 10px;border:0;border-radius:10px;background:none;
      color:var(--ink);font:inherit;font-size:14px;font-weight:540;cursor:pointer;text-align:left}
    .gs-item:hover{background:var(--surface-2)}
    .gs-item.on{background:color-mix(in srgb,var(--accent) 14%,var(--surface-2))}
    .gs-check{margin-left:auto;color:var(--accent);flex:0 0 auto}
    @keyframes gsIn{from{opacity:0;transform:translateY(-4px)}}
  `],
  template: `
    <div class="gs">
      <button class="gs-btn" type="button" [attr.aria-label]="ariaLabel()" (click)="toggle($event)">
        @if (current()?.short) { <span class="gs-badge">{{ current()?.short }}</span> }
        <span class="gs-txt">{{ current()?.label ?? placeholder() }}</span>
        <svg class="gs-caret" [class.up]="open()" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
      </button>
      @if (open()) {
        <div class="gs-backdrop" (click)="open.set(false)"></div>
        <div class="gs-menu" role="listbox" [style.top.px]="menuPos()?.top" [style.left.px]="menuPos()?.left" [style.width.px]="menuPos()?.width">
          @for (o of options(); track o.value) {
            <button class="gs-item" type="button" role="option" [attr.aria-selected]="o.value === value()" [class.on]="o.value === value()" (click)="pick(o.value)">
              @if (o.short) { <span class="gs-badge">{{ o.short }}</span> }
              <span class="gs-txt">{{ o.label }}</span>
              @if (o.value === value()) {
                <svg class="gs-check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
              }
            </button>
          }
        </div>
      }
    </div>
  `,
})
export class GlassSelect {
  readonly options = input.required<SelectOption[]>();
  readonly value = model.required<string>();
  readonly ariaLabel = input<string | null>(null);
  readonly placeholder = input<string>('');

  protected readonly open = signal(false);
  protected readonly menuPos = signal<{ top: number; left: number; width: number } | null>(null);
  protected readonly current = computed(() => this.options().find(o => o.value === this.value()));

  /** Opens the menu as a viewport-fixed layer anchored to the button, so it escapes any
   *  ancestor stacking context / overflow (glass cards create both) and never hides behind
   *  sibling elements. */
  protected toggle(event: MouseEvent): void {
    if (this.open()) {
      this.open.set(false);
      return;
    }
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.menuPos.set({ top: Math.round(rect.bottom + 5), left: Math.round(rect.left), width: Math.round(rect.width) });
    this.open.set(true);
  }

  protected pick(v: string): void {
    this.value.set(v);
    this.open.set(false);
  }
}

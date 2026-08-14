import { Component, inject, signal } from '@angular/core';
import { Theme, ThemeService } from '../services/theme.service';

@Component({
  selector: 'app-theme-switcher',
  imports: [],
  styles: [`
    .tsw{position:relative;display:inline-flex}
    .tsw-menu{position:absolute;top:44px;right:0;z-index:50;min-width:212px;padding:6px;
      background:var(--sheen),var(--glass);border:1px solid var(--glass-brd);border-radius:16px;
      box-shadow:var(--shadow-hero);-webkit-backdrop-filter:var(--blur);backdrop-filter:var(--blur);
      display:flex;flex-direction:column;gap:2px;animation:tswIn .16s ease}
    .tsw-item{display:flex;align-items:center;gap:10px;width:100%;padding:9px 11px;border:0;border-radius:11px;
      background:none;color:var(--ink);font:inherit;font-size:14px;font-weight:540;cursor:pointer;text-align:left}
    .tsw-item:hover{background:var(--surface-2)}
    .tsw-dot{width:16px;height:16px;border-radius:50%;flex:0 0 auto;border:1px solid var(--glass-brd)}
    .tsw-check{margin-left:auto;color:var(--accent)}
    .tsw-backdrop{position:fixed;inset:0;z-index:49}
    @keyframes tswIn{from{opacity:0;transform:translateY(-4px)}}
  `],
  template: `
    <div class="tsw">
      <button class="icon-btn" type="button" (click)="open.set(!open())" aria-label="Тема оформлення">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2a10 10 0 1 0 0 20c.83 0 1.5-.67 1.5-1.5 0-.4-.15-.75-.4-1.02-.24-.26-.38-.6-.38-.98 0-.83.67-1.5 1.5-1.5H16a5 5 0 0 0 5-5c0-4.42-4.03-8-9-8z"/>
          <circle cx="7.5" cy="11.5" r="1.1" fill="currentColor" stroke="none"/>
          <circle cx="12" cy="7.5" r="1.1" fill="currentColor" stroke="none"/>
          <circle cx="16.5" cy="11" r="1.1" fill="currentColor" stroke="none"/>
        </svg>
      </button>
      @if (open()) {
        <div class="tsw-backdrop" (click)="open.set(false)"></div>
        <div class="tsw-menu" role="menu">
          @for (o of theme.options; track o.key) {
            <button class="tsw-item" type="button" role="menuitemradio" [attr.aria-checked]="theme.theme() === o.key" (click)="pick(o.key)">
              <span class="tsw-dot" [style.background]="o.swatch"></span>
              {{ o.label }}
              @if (theme.theme() === o.key) {
                <svg class="tsw-check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
              }
            </button>
          }
        </div>
      }
    </div>
  `,
})
export class ThemeSwitcher {
  protected readonly theme = inject(ThemeService);
  protected readonly open = signal(false);

  protected pick(key: Theme): void {
    this.theme.setTheme(key);
    this.open.set(false);
  }
}

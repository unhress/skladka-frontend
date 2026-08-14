import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CustomFlag } from '../i18n/languages';

/**
 * Renders one flag at a uniform size. Emoji flags for languages that have one
 * (🇺🇦 / 🇬🇧); an inline SVG for Crimean Tatar (`crh`), which has no emoji flag —
 * light blue field with the golden tamga (mirrors the FarmFlexity flag).
 */
@Component({
  selector: 'app-flag',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (custom() === 'crh') {
      <svg viewBox="0 0 300 225" class="flag" xmlns="http://www.w3.org/2000/svg" [attr.aria-label]="ariaLabel()">
        <rect width="300" height="225" fill="#61B9E4" />
        <g transform="translate(0,12)" fill="#FFD700">
          <path d="M38.8,32.2c1.7,0,3.1,1.4,3.1,3.1v21c0,8.4,6.8,15.2,15.2,15.2H76v-8H57.1c-4,0-7.2-3.2-7.2-7.2v-21c0-1.7-1.4-3.1-3.1-3.1h-8z" />
          <path d="M68,32.2c1.7,0,3.1,1.4,3.1,3.1v36.2h-8V35.3c0-1.7,1.4-3.1,3.1-3.1h1.8z" />
          <path d="M21.5,32.2c1.7,0,3.1,1.4,3.1,3.1v21c0,4,3.2,7.2,7.2,7.2H51v8H31.8c-8.4,0-15.2-6.8-15.2-15.2v-21c0-1.7,1.4-3.1,3.1-3.1h1.8z" />
        </g>
      </svg>
    } @else {
      <span class="flag flag-emoji" [attr.aria-label]="ariaLabel()">{{ emoji() }}</span>
    }
  `,
  styles: [`
    :host{display:inline-block;width:24px;height:18px;line-height:0;flex:0 0 auto}
    .flag{display:block;width:100%;height:100%;border-radius:3px;overflow:hidden;box-shadow:0 0 1px rgba(0,0,0,.35)}
    .flag-emoji{font-size:17px;line-height:18px;text-align:center;box-shadow:none}
  `],
})
export class Flag {
  readonly emoji = input<string | undefined>(undefined);
  readonly custom = input<CustomFlag | null>(null);
  readonly ariaLabel = input<string | null>(null);
}

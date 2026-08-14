import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { LangCode } from '../i18n/languages';

/**
 * Renders one flag at a uniform size as inline SVG (emoji flags don't render on
 * Windows, so every flag is drawn): 🇺🇦 Ukraine, 🇬🇧 the Union Jack, and the
 * Crimean Tatar flag — azure field with the golden Tarak-tamga in the canton.
 */
@Component({
  selector: 'app-flag',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @switch (code()) {
      @case ('uk') {
        <svg class="flag" viewBox="0 0 3 2" preserveAspectRatio="xMidYMid slice" [attr.aria-label]="ariaLabel()">
          <rect width="3" height="2" fill="#FFD500" />
          <rect width="3" height="1" fill="#005BBB" />
        </svg>
      }
      @case ('en') {
        <svg class="flag" viewBox="0 0 60 30" preserveAspectRatio="xMidYMid slice" [attr.aria-label]="ariaLabel()">
          <clipPath id="ff-uk-s"><path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" /></clipPath>
          <rect width="60" height="30" fill="#012169" />
          <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" stroke-width="6" />
          <path d="M0,0 L60,30 M60,0 L0,30" clip-path="url(#ff-uk-s)" stroke="#C8102E" stroke-width="4" />
          <path d="M30,0 v30 M0,15 h60" stroke="#fff" stroke-width="10" />
          <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" stroke-width="6" />
        </svg>
      }
      @case ('crh') {
        <svg class="flag" viewBox="0 0 300 200" preserveAspectRatio="xMidYMid slice" [attr.aria-label]="ariaLabel()">
          <rect width="300" height="200" fill="#1B9CE2" />
          <g transform="translate(36,34) scale(0.62)" fill="#F7E017">
            <rect x="0" y="27" width="120" height="15" />
            <rect x="0" y="6" width="15" height="21" />
            <rect x="52.5" y="0" width="15" height="27" />
            <rect x="105" y="6" width="15" height="21" />
            <rect x="52.5" y="42" width="15" height="24" />
            <rect x="42" y="66" width="36" height="15" />
          </g>
        </svg>
      }
    }
  `,
  styles: [`
    :host{display:inline-block;width:24px;height:16px;line-height:0;flex:0 0 auto}
    .flag{display:block;width:100%;height:100%;border-radius:3px;overflow:hidden;box-shadow:0 0 0 1px rgba(0,0,0,.12)}
  `],
})
export class Flag {
  readonly code = input.required<LangCode>();
  readonly ariaLabel = input<string | null>(null);
}

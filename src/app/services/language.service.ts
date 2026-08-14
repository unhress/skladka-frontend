import { Injectable, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { APP_LANGUAGES, DEFAULT_LANG, LangCode, SUPPORTED_LANGS } from '../i18n/languages';

const STORAGE_KEY = 'skladka_lang';

/** Owns the active UI language: resolves it on boot, persists changes, drives ngx-translate. */
@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly translate = inject(TranslateService);

  readonly languages = APP_LANGUAGES;
  readonly current = signal<LangCode>(DEFAULT_LANG);

  /** Called once on app boot (from the root component). */
  init(): void {
    this.translate.addLangs([...SUPPORTED_LANGS]);
    this.use(this.resolveInitial());
  }

  use(code: LangCode): void {
    this.translate.use(code);
    this.current.set(code);
    document.documentElement.lang = code;
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {
      /* private mode — non-fatal */
    }
  }

  private resolveInitial(): LangCode {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    if (saved && this.isSupported(saved)) {
      return saved;
    }
    const browser = (navigator.language || '').slice(0, 2).toLowerCase();
    return this.isSupported(browser) ? browser : DEFAULT_LANG;
  }

  private isSupported(code: string): code is LangCode {
    return (SUPPORTED_LANGS as readonly string[]).includes(code);
  }
}

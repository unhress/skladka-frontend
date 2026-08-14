/** Languages Skladka ships. `uk` is primary; every flag is drawn inline (see Flag component). */
export type LangCode = 'uk' | 'en' | 'crh';

export interface AppLanguage {
  code: LangCode;
  /** Endonym shown in the picker. */
  label: string;
}

export const APP_LANGUAGES: readonly AppLanguage[] = [
  { code: 'uk', label: 'Українська' },
  { code: 'en', label: 'English' },
  { code: 'crh', label: 'Qırımtatar' },
];

export const SUPPORTED_LANGS: readonly LangCode[] = APP_LANGUAGES.map(l => l.code);
export const DEFAULT_LANG: LangCode = 'uk';

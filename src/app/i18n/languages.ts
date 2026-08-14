/** Languages Skladka ships. `uk` is primary; `crh` (Crimean Tatar) has no library/emoji flag. */
export type LangCode = 'uk' | 'en' | 'crh';
export type CustomFlag = 'crh';

export interface AppLanguage {
  code: LangCode;
  /** Endonym shown in the picker. */
  label: string;
  /** Emoji flag for languages that have one. */
  emoji?: string;
  /** Inline-SVG flag for languages without an emoji/library flag. */
  custom?: CustomFlag;
}

export const APP_LANGUAGES: readonly AppLanguage[] = [
  { code: 'uk', label: 'Українська', emoji: '🇺🇦' },
  { code: 'en', label: 'English', emoji: '🇬🇧' },
  { code: 'crh', label: 'Qırımtatar', custom: 'crh' },
];

export const SUPPORTED_LANGS: readonly LangCode[] = APP_LANGUAGES.map(l => l.code);
export const DEFAULT_LANG: LangCode = 'uk';

import { Injectable, signal } from '@angular/core';

export type Theme = 'light' | 'glassier' | 'dark' | 'rose' | 'candy';

export interface ThemeOption {
  key: Theme;
  label: string;
}

const KEY = 'skladka_theme';
const DARK_THEMES = new Set<Theme>(['dark']);
const THEME_COLOR: Record<Theme, string> = {
  light: '#e9ebf0',
  glassier: '#e6edf6',
  dark: '#0f1013',
  rose: '#f3eef7',
  candy: '#ffe3f0',
};

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly options: ThemeOption[] = [
    { key: 'light', label: 'Світле скло' },
    { key: 'glassier', label: 'Скляне' },
    { key: 'dark', label: 'Темне' },
    { key: 'rose', label: 'Рожеве (лавандове)' },
    { key: 'candy', label: 'Рожеве яскраве' },
  ];

  readonly theme = signal<Theme>(readInitial());

  constructor() {
    this.apply();
  }

  /** Light vs dark, for the sun/moon icon. */
  effective(): 'light' | 'dark' {
    return DARK_THEMES.has(this.theme()) ? 'dark' : 'light';
  }

  setTheme(theme: Theme): void {
    this.theme.set(theme);
    localStorage.setItem(KEY, theme);
    this.apply();
  }

  /** Quick control (topbar icon) — cycles through all themes. */
  toggle(): void {
    const order = this.options.map(o => o.key);
    const next = order[(order.indexOf(this.theme()) + 1) % order.length];
    this.setTheme(next);
  }

  private apply(): void {
    const theme = this.theme();
    document.documentElement.setAttribute('data-theme', theme);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme]);
  }
}

function readInitial(): Theme {
  const value = localStorage.getItem(KEY);
  if (value === 'light' || value === 'glassier' || value === 'dark' || value === 'rose' || value === 'candy') {
    return value;
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

import { Injectable, signal } from '@angular/core';

export type Theme = 'light' | 'glassier' | 'spring' | 'dark' | 'rose' | 'candy';

export interface ThemeOption {
  key: Theme;
  label: string;
  swatch: string;
}

const KEY = 'skladka_theme';
const DARK_THEMES = new Set<Theme>(['dark']);
const THEME_COLOR: Record<Theme, string> = {
  light: '#e9ebf0',
  glassier: '#e6edf6',
  spring: '#e6efe2',
  dark: '#0f1013',
  rose: '#f3eef7',
  candy: '#ffe3f0',
};

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly options: ThemeOption[] = [
    { key: 'light', label: 'Світле скло', swatch: '#e7eaf0' },
    { key: 'glassier', label: 'Скляне', swatch: '#d8e6f6' },
    { key: 'spring', label: 'Весняне зелене', swatch: '#cfe6c6' },
    { key: 'dark', label: 'Темне', swatch: '#1a1c20' },
    { key: 'rose', label: 'Рожеве (лавандове)', swatch: '#e6d6ef' },
    { key: 'candy', label: 'Рожеве яскраве', swatch: '#ffc6e0' },
  ];

  readonly theme = signal<Theme>(readInitial());

  constructor() {
    this.apply();
  }

  /** Light vs dark, for any sun/moon UI. */
  effective(): 'light' | 'dark' {
    return DARK_THEMES.has(this.theme()) ? 'dark' : 'light';
  }

  setTheme(theme: Theme): void {
    this.theme.set(theme);
    localStorage.setItem(KEY, theme);
    this.apply();
  }

  private apply(): void {
    const theme = this.theme();
    document.documentElement.setAttribute('data-theme', theme);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme]);
  }
}

function readInitial(): Theme {
  const value = localStorage.getItem(KEY);
  const valid: Theme[] = ['light', 'glassier', 'spring', 'dark', 'rose', 'candy'];
  if (valid.includes(value as Theme)) {
    return value as Theme;
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

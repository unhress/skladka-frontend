import { Injectable, signal } from '@angular/core';

const KEY = 'skladka_theme';
type Theme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly override = signal<Theme | null>(read());

  constructor() {
    this.apply();
  }

  effective(): Theme {
    const chosen = this.override();
    if (chosen) return chosen;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  toggle(): void {
    const next: Theme = this.effective() === 'dark' ? 'light' : 'dark';
    this.override.set(next);
    localStorage.setItem(KEY, next);
    this.apply();
  }

  private apply(): void {
    const chosen = this.override();
    if (chosen) {
      document.documentElement.setAttribute('data-theme', chosen);
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }
}

function read(): Theme | null {
  const value = localStorage.getItem(KEY);
  return value === 'light' || value === 'dark' ? value : null;
}

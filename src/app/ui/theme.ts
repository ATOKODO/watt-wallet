import { Injectable, signal } from '@angular/core';

export type Theme = 'light' | 'dark';

const preferenceKey = 'watt-wallet-theme';

export function initialTheme(): Theme {
  try {
    const saved = localStorage.getItem(preferenceKey);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // Storage can be unavailable in private browsing; the theme still works for this session.
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset['theme'] = theme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', theme === 'dark' ? '#18211c' : '#f7f8f2');
}

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<Theme>(initialTheme());

  constructor() {
    applyTheme(this.theme());
  }

  toggle() {
    const theme = this.theme() === 'dark' ? 'light' : 'dark';
    this.theme.set(theme);
    applyTheme(theme);
    try {
      localStorage.setItem(preferenceKey, theme);
    } catch {
      // Keep the selected appearance for this session if storage is unavailable.
    }
  }
}

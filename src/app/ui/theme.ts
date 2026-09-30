import { Injectable, signal } from '@angular/core';
import { accentPresets, accentTone, defaultAccent, themeColor, validAccent } from './palette';

export type Theme = 'light' | 'dark';

const preferenceKey = 'watt-wallet-theme';
const accentKey = 'watt-wallet-accent';

export function initialTheme(): Theme {
  try {
    const saved = localStorage.getItem(preferenceKey);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // Storage can be unavailable in private browsing; the theme still works for this session.
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function initialAccent(): string {
  try {
    const saved = localStorage.getItem(accentKey);
    if (validAccent(saved)) return saved.toLowerCase();
  } catch {
    // The palette also works when storage is unavailable.
  }
  return defaultAccent;
}

export function applyTheme(theme: Theme, accent = defaultAccent) {
  const root = document.documentElement;
  root.dataset['theme'] = theme;
  root.dataset['accent'] = accent;
  const tone = accentTone(accent);
  if (accent === defaultAccent) root.style.removeProperty('--accent-hue');
  else root.style.setProperty('--accent-hue', String(tone.hue));
  root.style.setProperty('--accent-chroma', String(tone.chromaScale));
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', themeColor(theme === 'dark' ? '#18211c' : '#f7f8f2', accent));
}

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<Theme>(initialTheme());
  readonly accent = signal(initialAccent());
  readonly presets = accentPresets;

  constructor() {
    applyTheme(this.theme(), this.accent());
  }

  toggle() {
    const theme = this.theme() === 'dark' ? 'light' : 'dark';
    this.theme.set(theme);
    applyTheme(theme, this.accent());
    this.save(preferenceKey, theme);
  }

  setAccent(value: string) {
    if (!validAccent(value)) return;
    const accent = value.toLowerCase();
    this.accent.set(accent);
    applyTheme(this.theme(), accent);
    this.save(accentKey, accent);
  }

  resetAccent() {
    this.setAccent(defaultAccent);
  }

  private save(key: string, value: string) {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Keep the selected appearance for this session if storage is unavailable.
    }
  }
}

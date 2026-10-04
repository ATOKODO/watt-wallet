import { signal } from '@angular/core';
import { LanguageService, type Language, applyLanguage } from '../src/app/ui/language';
import { ThemeService, type Theme, applyTheme } from '../src/app/ui/theme';
import { accentPresets, defaultAccent, validAccent } from '../src/app/ui/palette';
import { seedWorkspace } from '../src/app/domain/seed';
import { WalletStore } from '../src/app/state';

// Reuse production formatting and translation, with session-only preferences.
// Never instantiate WalletStore: that would open the user's real IndexedDB workspace.
export const storyLanguage = Object.assign(Object.create(LanguageService.prototype) as LanguageService, {
  language: signal<Language>('fr'),
  setLanguage(language: Language) {
    this.language.set(language);
    applyLanguage(language);
  },
});
export const storyTheme = Object.assign(Object.create(ThemeService.prototype) as ThemeService, {
  theme: signal<Theme>('light'),
  accent: signal(defaultAccent),
  presets: accentPresets,
  toggle() {
    this.theme.set(this.theme() === 'light' ? 'dark' : 'light');
    applyTheme(this.theme(), this.accent());
  },
  setAccent(accent: string) {
    if (validAccent(accent)) {
      this.accent.set(accent);
      applyTheme(this.theme(), accent);
    }
  },
});

export function storyStore() {
  const workspace = seedWorkspace();
  const assets = new Map<string, Uint8Array>();
  return {
    home: () => workspace.homes[0],
    scenarioId: signal<string | null>(null),
    message: (error: unknown) => (error instanceof Error ? error.message : 'Story fixture error'),
    repository: {
      getAsset: async (id: string) => assets.get(id)?.slice() ?? null,
      putAsset: async (id: string, bytes: Uint8Array) => {
        assets.set(id, bytes.slice());
      },
    },
  };
}
export const storyProviders = [
  { provide: LanguageService, useValue: storyLanguage },
  { provide: ThemeService, useValue: storyTheme },
  { provide: WalletStore, useFactory: storyStore },
];

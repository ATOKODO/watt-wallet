import { Injectable, Pipe, PipeTransform, inject, signal } from '@angular/core';
import { DeviceDefinition } from '../domain/models';
import { seedLibrary } from '../domain/seed';
import english from './i18n/en.json';

export type Language = 'fr' | 'en';
export const languageKey = 'watt-wallet-language';
const dictionary: Record<string, string> = english;
const normalize = (text: string) => text.replace(/\s+/g, ' ').trim();
const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const patterns = Object.entries(dictionary)
  .filter(([key, value]) => key !== value && /\{\d+\}/.test(key))
  .map(([key, value]) => {
    const indexes: number[] = [];
    let start = 0;
    let expression = '^';
    for (const match of key.matchAll(/\{(\d+)\}/g)) {
      expression += escapeRegex(key.slice(start, match.index)) + '(.+?)';
      indexes.push(Number(match[1]));
      start = match.index! + match[0].length;
    }
    return {
      expression: new RegExp(expression + escapeRegex(key.slice(start)) + '$'),
      indexes,
      value,
      specificity: key.replace(/\{\d+\}/g, '').length,
    };
  })
  .sort((a, b) => b.specificity - a.specificity);
export function translate(source: string, language: Language, parameters: readonly unknown[] = []): string {
  let value = source;
  if (language === 'en') {
    const key = normalize(source);
    value = dictionary[key] ?? source;
    if (value === source && !parameters.length) {
      for (const pattern of patterns) {
        const match = pattern.expression.exec(key);
        if (!match) continue;
        const captured: string[] = [];
        pattern.indexes.forEach((index, i) => (captured[index] = match[i + 1]));
        value = pattern.value.replace(/\{(\d+)\}/g, (_, index) => captured[Number(index)] ?? '');
        break;
      }
    }
  }
  return parameters.length
    ? value.replace(/\{(\d+)\}/g, (_, index) => String(parameters[Number(index)] ?? ''))
    : value;
}
export function initialLanguage(): Language {
  try {
    if (localStorage.getItem(languageKey) === 'en') return 'en';
  } catch {
    /* Storage can be unavailable. */
  }
  return 'fr';
}
export function applyLanguage(language: Language) {
  document.documentElement.lang = language;
  document.title =
    language === 'en' ? 'Watt Wallet · Your energy, made clear' : 'Watt Wallet · Votre énergie, en clair';
}
const seedNames = new Map(seedLibrary().map((device) => [device.id, device.name]));
@Injectable({ providedIn: 'root' })
export class LanguageService {
  readonly language = signal<Language>(initialLanguage());
  constructor() {
    applyLanguage(this.language());
  }
  setLanguage(language: Language) {
    if (language !== 'fr' && language !== 'en') return;
    this.language.set(language);
    applyLanguage(language);
    try {
      localStorage.setItem(languageKey, language);
    } catch {
      /* Keep the in-session choice. */
    }
  }
  locale() {
    return this.language() === 'en' ? 'en-GB' : 'fr-FR';
  }
  number(value: number, digits = 0) {
    return new Intl.NumberFormat(this.locale(), { maximumFractionDigits: digits }).format(value);
  }
  money(value: number, digits = 0) {
    return new Intl.NumberFormat(this.locale(), {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: digits,
      minimumFractionDigits: 0,
    }).format(value);
  }
  t(source: string, parameters: readonly unknown[] = []) {
    return translate(source, this.language(), parameters);
  }
  deviceName(device: DeviceDefinition) {
    return seedNames.get(device.id) === device.name ? this.t(device.name) : device.name;
  }
  builtinName(id: string) {
    return this.t(seedNames.get('builtin-' + id) ?? id);
  }
  error(source: string) {
    // Schema diagnostics use protocol field names, while the surrounding explanation is localized.
    if (source.trim().startsWith('['))
      return this.t(
        'Vérifiez les champs : nom requis, valeurs positives, heures ≤ 24, jours ≤ 365 et pourcentage ≤ 100.',
      );
    return this.t(source);
  }
}
@Pipe({ name: 't', standalone: true, pure: false })
export class TranslatePipe implements PipeTransform {
  private readonly i18n = inject(LanguageService);
  transform(value: unknown, parameters: readonly unknown[] = []): string {
    if (typeof value === 'number') return this.i18n.number(value, 2);
    return this.i18n.t(String(value ?? ''), parameters);
  }
}

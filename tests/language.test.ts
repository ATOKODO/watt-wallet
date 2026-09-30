import { describe, it, expect, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseTemplate } from '@angular/compiler';
import { LanguageService, initialLanguage, translate } from '../src/app/ui/language';
import { seedLibrary } from '../src/app/domain/seed';
import english from '../src/app/ui/i18n/en.json';

afterEach(() => vi.unstubAllGlobals());
describe('languages', () => {
  it('translates full messages, variables and formatted legacy messages', () => {
    expect(translate('Mon logement', 'en')).toBe('My home');
    expect(translate('Dont {0} d’abonnement.', 'en', ['€180'])).toBe(
      'Including €180 for the standing charge.',
    );
    expect(translate('Ajouter My heater', 'en')).toBe('Add My heater');
    expect(translate('Retirer de ce scénario : My heater', 'en')).toBe(
      'Remove from this scenario: My heater',
    );
    expect(translate('Champ requis manquant ou incomplet : name', 'en')).toBe(
      'Missing or incomplete required field: name',
    );
    expect(translate('HP €0.3 · HC €0.2 / kWh', 'en')).toBe('Peak €0.3 · Off-peak €0.2 / kWh');
    expect(translate('Dont {0} d’abonnement.', 'fr', ['180 €'])).toBe('Dont 180 € d’abonnement.');
    expect(translate('My custom name', 'en')).toBe('My custom name');
  });
  it('persists the preference and localizes numbers without altering device data', () => {
    const saved = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => saved.get(k),
      setItem: (k: string, v: string) => saved.set(k, v),
    });
    const root = { lang: 'fr' };
    vi.stubGlobal('document', { documentElement: root, title: '' });
    expect(initialLanguage()).toBe('fr');
    const service = new LanguageService();
    const device = seedLibrary()[0];
    service.setLanguage('en');
    expect(initialLanguage()).toBe('en');
    expect(root.lang).toBe('en');
    expect(service.number(182.5, 1)).toBe('182.5');
    expect(service.money(182.5, 1)).toBe('€182.5');
    expect(service.deviceName(device)).toBe('Electric heater');
    expect(device.name).toBe('Radiateur électrique');
    expect(service.deviceName({ ...device, id: 'custom', name: 'Bibliothèque' })).toBe('Bibliothèque');
    service.setLanguage('fr');
    expect(service.number(182.5, 1)).toBe('182,5');
    expect(service.deviceName(device)).toBe('Radiateur électrique');
  });
  it('works when local preferences cannot be stored', () => {
    vi.stubGlobal('localStorage', {
      getItem() {
        throw Error('disabled');
      },
      setItem() {
        throw Error('disabled');
      },
    });
    vi.stubGlobal('document', { documentElement: { lang: 'fr' }, title: '' });
    const service = new LanguageService();
    expect(() => service.setLanguage('en')).not.toThrow();
    expect(service.language()).toBe('en');
  });
  it('covers template messages, accessible labels, categories and all built-in silhouettes', () => {
    const dictionary: Record<string, string> = english;
    const normalize = (value: string) => value.replace(/\s+/g, ' ').trim();
    const visitExpression = (ast: any) => {
      if (!ast || typeof ast !== 'object') return;
      if (
        ast.constructor.name === 'BindingPipe' &&
        ast.name === 't' &&
        ast.exp?.constructor.name === 'LiteralPrimitive' &&
        typeof ast.exp.value === 'string'
      )
        expect(dictionary[normalize(ast.exp.value)], ast.exp.value).toBeDefined();
      for (const [key, value] of Object.entries(ast)) {
        if (['sourceSpan', 'span', 'nameSpan'].includes(key)) continue;
        if (Array.isArray(value)) value.forEach(visitExpression);
        else if (value && typeof value === 'object') visitExpression(value);
      }
    };
    const walk = (nodes: any[]) => {
      for (const node of nodes) {
        if (node.constructor.name === 'Text' && /[A-Za-zÀ-ÿ]/.test(node.value))
          expect(['Français', 'English']).toContain(node.value.trim());
        visitExpression(node.value);
        for (const a of [...(node.inputs ?? []), ...(node.attributes ?? [])]) {
          if (['aria-label', 'title', 'placeholder'].includes(a.name) && typeof a.value === 'string')
            throw Error('Unlocalized attribute: ' + a.value);
          if (a.value?.ast) visitExpression(a.value.ast);
        }
        for (const key of ['children', 'branches', 'cases']) if (Array.isArray(node[key])) walk(node[key]);
        if (node.empty) walk([node.empty]);
      }
    };
    for (const file of ['src/app/app.html', 'src/app/ui/device-editor.ts', 'src/app/scene/diorama.ts']) {
      const source = readFileSync(file, 'utf8');
      let html = source;
      if (!file.endsWith('.html')) {
        const start = source.indexOf('template:');
        const tick = source.indexOf(String.fromCharCode(96), start);
        html = source.slice(tick + 1, source.indexOf(String.fromCharCode(96), tick + 1));
      }
      const ast = parseTemplate(html, file, { preserveWhitespaces: true });
      expect(ast.errors).toBeNull();
      walk(ast.nodes);
    }
    for (const device of seedLibrary()) {
      expect(dictionary[device.name]).toBeTruthy();
      expect(dictionary[device.category]).toBeTruthy();
    }
  });
});

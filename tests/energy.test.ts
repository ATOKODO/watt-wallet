import { describe, expect, it } from 'vitest';
import { annualEnergy, calculate, compare } from '../src/app/domain/energy';
import { copy, defaultTariff } from '../src/app/domain/models';
import { makeInstance, seedLibrary } from '../src/app/domain/seed';

function power() {
  const d = makeInstance(seedLibrary()[4]);
  d.definition.energy = { method: 'power', activeW: 100, standbyW: 0 };
  d.usage.hoursPerDay = 5;
  d.usage.daysPerYear = 365;
  return d;
}
describe('moteur de consommation', () => {
  it('100 W × 5 h × 365 = 182,5 kWh', () => expect(annualEnergy(power())).toBe(182.5));
  it('multiplie par la quantité', () => {
    const d = power();
    d.quantity = 6;
    expect(annualEnergy(d)).toBe(1095);
  });
  it('veille uniquement sur les heures restantes', () => {
    const d = power();
    d.definition.energy = { method: 'power', activeW: 100, standbyW: 2 };
    expect(annualEnergy(d)).toBeCloseTo(196.37);
  });
  it('respecte les jours de chauffage, veille hors saison incluse', () => {
    const d = power();
    d.usage.daysPerYear = 150;
    expect(annualEnergy(d)).toBe(75);
  });
  it('calcule les cycles sur 52 semaines et leur veille', () => {
    const d = power();
    d.definition.energy = { method: 'cycle', kwhPerCycle: 0.8, standbyW: 1 };
    d.usage.cyclesPerWeek = 3;
    d.usage.cycleHours = 2;
    expect(annualEnergy(d)).toBeCloseTo(124.8 + 8.448);
  });
  it('la durée du cycle est obligatoire avec veille', () => {
    const d = power();
    d.definition.energy = { method: 'cycle', kwhPerCycle: 1, standbyW: 1 };
    d.usage.cycleHours = 0;
    expect(() => annualEnergy(d)).toThrow('durée');
  });
  it('refuse plus de 8760 heures de cycles', () => {
    const d = power();
    d.definition.energy = { method: 'cycle', kwhPerCycle: 1, standbyW: 0 };
    d.usage.cyclesPerWeek = 100;
    d.usage.cycleHours = 3;
    expect(() => annualEnergy(d)).toThrow('8 760');
  });
  it('une valeur annuelle ne reçoit pas de veille supplémentaire', () => {
    const d = power();
    d.definition.energy = { method: 'annual', kwhPerYear: 210 };
    expect(annualEnergy(d)).toBe(210);
  });
  it.each([-1, NaN, Infinity])('refuse une puissance invalide %s', (value) => {
    const d = power();
    d.definition.energy = { method: 'power', activeW: value, standbyW: 0 };
    expect(() => annualEnergy(d)).toThrow();
  });
  it.each([0, -1, 1.5])('refuse une quantité invalide %s', (value) => {
    const d = power();
    d.quantity = value;
    expect(() => annualEnergy(d)).toThrow();
  });
  it('refuse 25 h/jour ou 366 jours/an', () => {
    const d = power();
    d.usage.hoursPerDay = 25;
    expect(() => annualEnergy(d)).toThrow();
    d.usage.hoursPerDay = 1;
    d.usage.daysPerYear = 366;
    expect(() => annualEnergy(d)).toThrow();
  });
  it('calcule HP/HC avec sa fraction réelle et sépare l’abonnement', () => {
    const d = power();
    d.usage.offPeakPercent = 40;
    const r = calculate({
      devices: [d],
      tariff: { ...defaultTariff, mode: 'hp-hc', peakPrice: 0.3, offPeakPrice: 0.2, subscription: 100 },
    });
    expect(r.energyCost).toBeCloseTo(182.5 * 0.26);
    expect(r.totalCost).toBeCloseTo(147.45);
    expect(r.monthlyCost).toBeCloseTo(147.45 / 12);
    expect(r.devices[0].share).toBe(1);
    expect(r.categories.reduce((s, c) => s + c.cost, 0)).toBe(r.energyCost);
  });
  it('les HP valent 100 % quand aucune HC n’est renseignée', () => {
    const r = calculate({
      devices: [power()],
      tariff: { ...defaultTariff, mode: 'hp-hc', peakPrice: 0.3, offPeakPrice: 0.2 },
    });
    expect(r.energyCost).toBeCloseTo(54.75);
  });
  it('gère un logement vide et une consommation nulle', () => {
    const r = calculate({ devices: [], tariff: defaultTariff });
    expect(r.kwh).toBe(0);
    expect(r.totalCost).toBe(180);
    expect(r.categories.every((c) => c.share === 0)).toBe(true);
    const d = power();
    d.usage.hoursPerDay = 0;
    expect(calculate({ devices: [d], tariff: defaultTariff }).devices[0].share).toBe(0);
  });
  it('ne modifie pas les données et ne fait pas d’arrondis intermédiaires', () => {
    const d = power();
    const before = copy(d);
    const r = calculate({ devices: [d], tariff: { ...defaultTariff, basePrice: 0.23456789 } });
    expect(d).toEqual(before);
    expect(r.energyCost).toBe(182.5 * 0.23456789);
  });
  it('compare les catégories et calcule le retour', () => {
    const reference = calculate({ devices: [power()], tariff: defaultTariff });
    const scenario = calculate({ devices: [], tariff: defaultTariff });
    const result = compare(reference, scenario, 100);
    expect(result.annualSaving).toBe(45.625);
    expect(result.paybackYears).toBeCloseTo(100 / 45.625);
    expect(result.categories.reduce((s, c) => s + c.kwhSaving, 0)).toBe(182.5);
  });
  it('ne promet pas d’amortissement sans économie', () => {
    const r = calculate({ devices: [], tariff: defaultTariff });
    expect(compare(r, r, 100).paybackYears).toBeNull();
  });
});

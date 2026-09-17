import {
  CalculationResult,
  DeviceDefinition,
  DeviceInstance,
  Scenario,
  Tariff,
  UsageProfile,
  categories,
  instanceSchema,
  tariffSchema,
} from './models';

export function validateUsage(definition: DeviceDefinition, usage: UsageProfile): void {
  const e = definition.energy;
  if (e.method === 'cycle') {
    if (e.standbyW > 0 && usage.cycleHours <= 0)
      throw new Error('Indiquez la durée du cycle pour calculer la veille.');
    if (usage.cycleHours * usage.cyclesPerWeek * 52 > 8760)
      throw new Error('Les cycles dépassent les 8 760 heures disponibles par an.');
  }
}

export function annualEnergy(device: DeviceInstance): number {
  instanceSchema.parse(device);
  const { definition: d, usage: u, quantity } = device;
  validateUsage(d, u);
  const e = d.energy;
  if (e.method === 'annual') return e.kwhPerYear * quantity;
  const activeHours =
    e.method === 'power' ? u.hoursPerDay * u.daysPerYear : u.cycleHours * u.cyclesPerWeek * 52;
  const active =
    e.method === 'power' ? (e.activeW * activeHours) / 1000 : e.kwhPerCycle * u.cyclesPerWeek * 52;
  return (active + (e.standbyW * (8760 - activeHours)) / 1000) * quantity;
}

export function calculate(snapshot: { devices: DeviceInstance[]; tariff: Tariff }): CalculationResult {
  const t = tariffSchema.parse(snapshot.tariff);
  const devices = snapshot.devices.map((d) => {
    const kwh = annualEnergy(d);
    const rate =
      t.mode === 'base'
        ? t.basePrice
        : t.peakPrice * (1 - d.usage.offPeakPercent / 100) + (t.offPeakPrice * d.usage.offPeakPercent) / 100;
    return { id: d.id, kwh, cost: kwh * rate, category: d.definition.category, share: 0 };
  });
  const kwh = devices.reduce((sum, d) => sum + d.kwh, 0);
  const energyCost = devices.reduce((sum, d) => sum + d.cost, 0);
  devices.forEach((d) => (d.share = kwh ? d.kwh / kwh : 0));
  const grouped = categories.map((name) => {
    const subset = devices.filter((d) => d.category === name);
    const sum = subset.reduce((s, d) => s + d.kwh, 0);
    return { name, kwh: sum, cost: subset.reduce((s, d) => s + d.cost, 0), share: kwh ? sum / kwh : 0 };
  });
  const totalCost = energyCost + t.subscription;
  return {
    kwh,
    energyCost,
    subscription: t.subscription,
    totalCost,
    monthlyCost: totalCost / 12,
    devices,
    categories: grouped,
  };
}

export function compare(reference: CalculationResult, scenario: CalculationResult, initialCost: number) {
  const annualSaving = reference.totalCost - scenario.totalCost;
  return {
    annualSaving,
    kwhSaving: reference.kwh - scenario.kwh,
    paybackYears: annualSaving > 0 ? initialCost / annualSaving : null,
    categories: reference.categories.map((c) => ({
      name: c.name,
      kwhSaving: c.kwh - (scenario.categories.find((s) => s.name === c.name)?.kwh ?? 0),
      costSaving: c.cost - (scenario.categories.find((s) => s.name === c.name)?.cost ?? 0),
    })),
  };
}

export function validateSnapshot(snapshot: { devices: DeviceInstance[]; tariff: Tariff }) {
  const ids = new Set<string>();
  for (const d of snapshot.devices) {
    if (ids.has(d.id)) throw new Error('Identifiant d’appareil dupliqué.');
    ids.add(d.id);
  }
  calculate(snapshot);
}

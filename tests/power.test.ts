import { describe, expect, it } from 'vitest';
import { annualBreakdown } from '../src/app/domain/energy';
import { powerEstimate, simulatedTotal } from '../src/app/domain/power';
import { definitionSchema, homeSchema } from '../src/app/domain/models';
import { makeInstance, seedLibrary, seedWorkspace } from '../src/app/domain/seed';

describe('simulation de puissance distincte du calcul annuel', () => {
  it('utilise la puissance moyenne en marche, la veille et la quantite', () => {
    const device = makeInstance(seedLibrary()[4]);
    device.quantity = 3;
    expect(powerEstimate(device, 'running')).toEqual({ watts: 255, basis: 'active-average' });
    expect(powerEstimate(device, 'standby')).toEqual({ watts: 1.5, basis: 'standby' });
    expect(powerEstimate(device, 'off')).toEqual({ watts: 0, basis: 'off' });
  });

  it('deduit une moyenne de cycle sans la presenter comme une pointe', () => {
    const device = makeInstance(seedLibrary()[3]);
    device.usage.cycleHours = 2;
    expect(powerEstimate(device, 'running')).toEqual({ watts: 400, basis: 'cycle-average' });
    device.usage.cycleHours = 0;
    expect(powerEstimate(device, 'running').watts).toBeNull();
  });

  it('n utilise pas la puissance nominale comme puissance instantanee', () => {
    const device = makeInstance(seedLibrary()[2]);
    delete device.definition.simulatedRunningW;
    expect(powerEstimate(device, 'running').watts).toBeNull();
    expect(powerEstimate(device, 'standby').watts).toBeNull();
    device.definition.simulatedRunningW = 80;
    expect(powerEstimate(device, 'running')).toEqual({ watts: 80, basis: 'entered' });
  });

  it('signale les valeurs inconnues et ne change pas les kWh annuels', () => {
    const known = makeInstance(seedLibrary()[0]);
    const unknown = makeInstance(seedLibrary()[2]);
    delete unknown.definition.simulatedRunningW;
    unknown.quantity = 2;
    const annualBefore = annualBreakdown(known).totalKwh + annualBreakdown(unknown).totalKwh;
    const result = simulatedTotal([known, unknown], { [known.id]: 'running', [unknown.id]: 'running' });
    expect(result).toEqual({ watts: 1500, unknown: 2 });
    expect(annualBreakdown(known).totalKwh + annualBreakdown(unknown).totalKwh).toBe(annualBefore);
  });

  it('valide les champs de simulation et la reference facultative de facture', () => {
    const device = seedLibrary()[0];
    expect(definitionSchema.safeParse({ ...device, simulatedRunningW: -1 }).success).toBe(false);
    const home = seedWorkspace().homes[0];
    expect(homeSchema.safeParse(home).success).toBe(true);
    expect(homeSchema.safeParse({ ...home, observedAnnualKwh: 6000 }).success).toBe(true);
    expect(homeSchema.safeParse({ ...home, observedAnnualKwh: -1 }).success).toBe(false);
  });
});

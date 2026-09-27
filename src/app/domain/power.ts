import { DeviceInstance } from './models';

export type PowerState = 'off' | 'standby' | 'running';

export interface PowerEstimate {
  watts: number | null;
  basis: 'off' | 'entered' | 'active-average' | 'cycle-average' | 'standby' | 'unknown';
}

export function powerEstimate(device: DeviceInstance, state: PowerState): PowerEstimate {
  if (state === 'off') return { watts: 0, basis: 'off' };
  const definition = device.definition;
  const energy = definition.energy;
  if (state === 'standby') {
    const watts = definition.simulatedStandbyW ?? (energy.method === 'annual' ? null : energy.standbyW);
    return watts === null
      ? { watts: null, basis: 'unknown' }
      : { watts: watts * device.quantity, basis: 'standby' };
  }
  if (definition.simulatedRunningW !== undefined)
    return { watts: definition.simulatedRunningW * device.quantity, basis: 'entered' };
  if (energy.method === 'power') return { watts: energy.activeW * device.quantity, basis: 'active-average' };
  if (energy.method === 'cycle' && device.usage.cycleHours > 0)
    return {
      watts: (energy.kwhPerCycle * 1000 * device.quantity) / device.usage.cycleHours,
      basis: 'cycle-average',
    };
  return { watts: null, basis: 'unknown' };
}

export function simulatedTotal(
  devices: DeviceInstance[],
  states: Record<string, PowerState>,
): { watts: number; unknown: number } {
  let watts = 0;
  let unknown = 0;
  for (const device of devices) {
    const estimate = powerEstimate(device, states[device.id] ?? 'off');
    if (estimate.watts === null) unknown += device.quantity;
    else watts += estimate.watts;
  }
  return { watts, unknown };
}

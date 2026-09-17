import {
  BuiltinId,
  DeviceDefinition,
  DeviceInstance,
  Workspace,
  defaultTariff,
  defaultUsage,
  copy,
  uid,
} from './models';

const specs: [
  BuiltinId,
  string,
  DeviceDefinition['category'],
  number,
  'power' | 'cycle' | 'annual',
  number,
  number,
  number,
][] = [
  ['radiator', 'Radiateur électrique', 'Chauffage', 1500, 'power', 1500, 5, 150],
  ['boiler', 'Ballon d’eau chaude', 'Eau chaude', 2200, 'annual', 1300, 0, 365],
  ['fridge', 'Réfrigérateur', 'Électroménager', 150, 'annual', 210, 0, 365],
  ['washer', 'Lave-linge', 'Électroménager', 2000, 'cycle', 0.8, 0, 365],
  ['tv', 'Télévision', 'Informatique & TV', 100, 'power', 85, 4, 365],
  ['bulb', 'Ampoule LED', 'Éclairage & autres', 9, 'power', 9, 5, 365],
  ['ac', 'Climatiseur', 'Chauffage', 1200, 'power', 800, 5, 60],
  ['freezer', 'Congélateur', 'Électroménager', 150, 'annual', 230, 0, 365],
  ['pc', 'Ordinateur fixe', 'Informatique & TV', 500, 'power', 180, 6, 300],
  ['laptop', 'Ordinateur portable', 'Informatique & TV', 65, 'power', 35, 7, 250],
  ['router', 'Box Internet', 'Informatique & TV', 12, 'power', 12, 24, 365],
  ['dishwasher', 'Lave-vaisselle', 'Électroménager', 2000, 'cycle', 0.85, 0, 365],
  ['oven', 'Four électrique', 'Cuisson', 2500, 'cycle', 0.9, 0, 365],
  ['hob', 'Plaques de cuisson', 'Cuisson', 6000, 'power', 1800, 0.5, 330],
];
export function seedLibrary(): DeviceDefinition[] {
  return specs.map(([visual, name, category, nominalW, method, value, hours, days]) => ({
    id: `builtin-${visual}`,
    name,
    category,
    nominalW,
    brand: '',
    reference: '',
    energy:
      method === 'power'
        ? { method, activeW: value, standbyW: visual === 'tv' ? 0.5 : 0 }
        : method === 'cycle'
          ? { method, kwhPerCycle: value, standbyW: 0 }
          : { method, kwhPerYear: value },
    defaultUsage: { ...defaultUsage, hoursPerDay: hours, daysPerYear: days },
    visual: { kind: 'builtin', id: visual },
    notes: 'Exemple indicatif, à adapter à votre appareil. Ce ne sont pas des mesures constructeur.',
  }));
}
export function makeInstance(definition: DeviceDefinition, index = 0): DeviceInstance {
  return {
    id: uid(),
    definition: copy(definition),
    usage: copy(definition.defaultUsage),
    quantity: 1,
    position: { x: ((index % 4) - 1.5) * 2.6, z: ((Math.floor(index / 4) % 5) - 1) * 2.7 },
  };
}
export function seedWorkspace(): Workspace {
  const library = seedLibrary();
  const devices = library.slice(0, 6).map((d, i) => makeInstance(d, i));
  devices[0].quantity = 3;
  devices[5].quantity = 6;
  const id = uid();
  return {
    version: 1,
    library,
    homes: [{ id, name: 'Mon petit chez-moi', devices, tariff: copy(defaultTariff), scenarios: [] }],
    activeHomeId: id,
  };
}

import { z } from 'zod';

export const categories = [
  'Chauffage',
  'Eau chaude',
  'Électroménager',
  'Informatique & TV',
  'Cuisson',
  'Éclairage & autres',
] as const;
export const builtinIds = [
  'bulb',
  'radiator',
  'ac',
  'boiler',
  'fridge',
  'freezer',
  'tv',
  'pc',
  'laptop',
  'router',
  'washer',
  'dishwasher',
  'oven',
  'hob',
] as const;
export type BuiltinId = (typeof builtinIds)[number];
export const categoryColors: Record<string, string> = {
  Chauffage: '#db936d',
  'Eau chaude': '#7dabb3',
  Électroménager: '#8aa57d',
  'Informatique & TV': '#a198bf',
  Cuisson: '#d7b460',
  'Éclairage & autres': '#b2bd70',
};
export const POSITION_LIMIT = 10000;

const positive = z.number().finite().min(0).max(1e9);
const id = z.string().min(1).max(120);
export const usageSchema = z
  .object({
    hoursPerDay: z.number().min(0).max(24),
    daysPerYear: z.number().min(0).max(365),
    cyclesPerWeek: positive,
    cycleHours: z.number().min(0).max(8760),
    offPeakPercent: z.number().min(0).max(100),
  })
  .strict();
export type UsageProfile = z.infer<typeof usageSchema>;
export const energySchema = z.discriminatedUnion('method', [
  z.object({ method: z.literal('power'), activeW: positive, standbyW: positive }).strict(),
  z.object({ method: z.literal('cycle'), kwhPerCycle: positive, standbyW: positive }).strict(),
  z.object({ method: z.literal('annual'), kwhPerYear: positive }).strict(),
]);
export const visualSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('builtin'), id: z.enum(builtinIds) }).strict(),
  z
    .object({
      kind: z.literal('glb'),
      assetId: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/),
      fallback: z.enum(builtinIds),
    })
    .strict(),
]);
export const definitionSchema = z
  .object({
    id,
    name: z.string().trim().min(1).max(100),
    brand: z.string().max(100),
    reference: z.string().max(100),
    category: z.enum(categories),
    nominalW: positive,
    simulatedRunningW: positive.optional(),
    simulatedStandbyW: positive.optional(),
    energy: energySchema,
    defaultUsage: usageSchema,
    visual: visualSchema,
    notes: z.string().max(2000),
  })
  .strict();
export type DeviceDefinition = z.infer<typeof definitionSchema>;
export const instanceSchema = z
  .object({
    id,
    definition: definitionSchema,
    usage: usageSchema,
    quantity: z.number().int().min(1).max(10000),
    position: z
      .object({
        x: z.number().finite().min(-POSITION_LIMIT).max(POSITION_LIMIT),
        z: z.number().finite().min(-POSITION_LIMIT).max(POSITION_LIMIT),
      })
      .strict(),
  })
  .strict();
export type DeviceInstance = z.infer<typeof instanceSchema>;
export const tariffSchema = z
  .object({
    mode: z.enum(['base', 'hp-hc']),
    basePrice: positive,
    peakPrice: positive,
    offPeakPrice: positive,
    subscription: positive,
  })
  .strict();
export type Tariff = z.infer<typeof tariffSchema>;
export const snapshotSchema = z
  .object({ tariff: tariffSchema, devices: z.array(instanceSchema).max(500) })
  .strict();
export const scenarioSchema = snapshotSchema
  .extend({ id, name: z.string().trim().min(1).max(100), initialCost: positive })
  .strict();
export type Scenario = z.infer<typeof scenarioSchema>;
export const homeSchema = snapshotSchema
  .extend({
    id,
    name: z.string().trim().min(1).max(100),
    observedAnnualKwh: positive.optional(),
    scenarios: z.array(scenarioSchema).max(50),
  })
  .strict();
export type Home = z.infer<typeof homeSchema>;
export const workspaceSchema = z
  .object({
    version: z.literal(1),
    library: z.array(definitionSchema).max(2000),
    homes: z.array(homeSchema).min(1).max(100),
    activeHomeId: id,
  })
  .strict();
export type Workspace = z.infer<typeof workspaceSchema>;
export interface DeviceResult {
  id: string;
  kwh: number;
  cost: number;
  share: number;
  category: string;
}
export interface CalculationResult {
  kwh: number;
  energyCost: number;
  subscription: number;
  totalCost: number;
  monthlyCost: number;
  devices: DeviceResult[];
  categories: { name: string; kwh: number; cost: number; share: number }[];
}
export const defaultUsage: UsageProfile = {
  hoursPerDay: 5,
  daysPerYear: 365,
  cyclesPerWeek: 3,
  cycleHours: 2,
  offPeakPercent: 0,
};
export const defaultTariff: Tariff = {
  mode: 'base',
  basePrice: 0.25,
  peakPrice: 0.27,
  offPeakPrice: 0.2,
  subscription: 180,
};
export const uid = () => crypto.randomUUID();
export const copy = <T>(value: T): T => structuredClone(value);

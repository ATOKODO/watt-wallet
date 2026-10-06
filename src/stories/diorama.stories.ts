import { figmaParameters } from './figma';
import { type Meta, type StoryObj } from '@storybook/angular-vite';
import { fn } from 'storybook/test';
import { DioramaComponent } from '../app/scene/diorama';
import { calculate } from '../app/domain/energy';
import { copy, defaultTariff } from '../app/domain/models';
import { seedWorkspace } from '../app/domain/seed';
const devices = seedWorkspace().homes[0].devices;
const meta: Meta<DioramaComponent> = {
  title: 'Features/Diorama',
  component: DioramaComponent,
  args: {
    devices: copy(devices),
    mode: 'consumption',
    selectedId: null,
    selected: fn(),
    moved: fn(),
    arranged: fn(),
    added: fn(),
  },
  argTypes: {
    devices: { control: 'object' },
    results: { control: false },
    mode: { control: 'select', options: ['consumption', 'placement'] },
    selectedId: { control: 'text' },
    theme: { control: false },
    accent: { control: false },
    selected: { action: 'selected', control: false },
    moved: { action: 'moved', control: false },
    arranged: { action: 'arranged', control: false },
    added: { action: 'added', control: false },
  },
  render: (args, context) => ({
    props: {
      ...args,
      results: calculate({ devices: args.devices ?? [], tariff: defaultTariff }).devices,
      theme: context.globals['theme'],
      accent: context.globals['accent'],
    },
    template: `<div class="ww-diorama-frame"><ww-diorama [devices]="devices" [results]="results" [mode]="mode" [theme]="theme" [accent]="accent" [selectedId]="selectedId" (selected)="selected($event)" (moved)="moved($event)" (arranged)="arranged($event)" (added)="added($event)"/></div>`,
  }),
  parameters: {
    ...figmaParameters('dioramaConsumption'),
    docs: {
      description: {
        component:
          'Production Three.js orthographic diorama. Orbit, zoom, pan, select and arrange the grid. Outputs are logged to Actions; the story does not persist movement. Consumption results are recalculated from the editable device fixture. Requires WebGL; the production fallback remains available otherwise.',
      },
    },
  },
};
export default meta;
type Story = StoryObj<DioramaComponent>;
export const Consumption: Story = { parameters: figmaParameters('dioramaConsumption') };
export const Placement: Story = {
  parameters: figmaParameters('dioramaPlacement'),
  args: { mode: 'placement' },
};
export const Empty: Story = { parameters: figmaParameters('dioramaEmpty'), args: { devices: [] } };
export const ZeroConsumption: Story = {
  parameters: figmaParameters('dioramaZero'),
  args: {
    devices: devices.map((d) => ({
      ...copy(d),
      definition: { ...copy(d.definition), energy: { method: 'annual', kwhPerYear: 0 } },
    })),
  },
};
export const Selected: Story = {
  parameters: figmaParameters('dioramaSelected'),
  args: { selectedId: devices[0].id },
};

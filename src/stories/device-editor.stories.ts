import { type Meta, type StoryObj } from '@storybook/angular-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { DeviceEditorComponent } from '../app/ui/device-editor';
import { seedLibrary, makeInstance } from '../app/domain/seed';
import { copy } from '../app/domain/models';
const library = seedLibrary();
const definition = (method: string) => copy(library.find((d) => d.energy.method === method)!);
const meta: Meta<DeviceEditorComponent> = {
  title: 'Features/Device editor',
  component: DeviceEditorComponent,
  args: { definition: definition('power'), instance: null, saving: false, committed: fn() },
  argTypes: {
    definition: { control: 'object' },
    instance: { control: 'object' },
    saving: { control: 'boolean' },
    committed: { action: 'committed', control: false },
  },
  render: (args) => ({
    props: args,
    template: `<section class="ww-editor-frame"><ww-device-editor [definition]="definition" [instance]="instance" [saving]="saving" (committed)="committed($event)"/></section>`,
  }),
  parameters: {
    docs: {
      description: {
        component:
          'The real reactive-form editor and JSON validation, using production contracts. Committed emits the validated draft into Actions; fixtures and imported GLB bytes stay in memory. An instance shows usages/quantity without the JSON tabs. Saving disables submission.',
      },
    },
  },
};
export default meta;
type Story = StoryObj<DeviceEditorComponent>;
export const PowerProfile: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const input = canvasElement.querySelector<HTMLInputElement>('input[formcontrolname="name"]')!;
    await userEvent.clear(input);
    await userEvent.type(input, 'Storybook heater');
    const button = canvas
      .getAllByRole('button')
      .find((b) => b.textContent?.includes('Enregistrer') || b.textContent?.includes('Save'))!;
    await userEvent.click(button);
    await expect(args.committed).toHaveBeenCalled();
  },
};
export const CycleProfile: Story = { args: { definition: definition('cycle') } };
export const AnnualProfile: Story = { args: { definition: definition('annual') } };
export const InstalledDevice: Story = {
  args: { definition: definition('power'), instance: { ...makeInstance(definition('power')), quantity: 6 } },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByRole('tab', { name: 'JSON' })).toBeNull();
  },
};
export const JsonValid: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('tab', { name: 'JSON' }));
    await expect(canvasElement.querySelector('.json-validation')).toHaveClass(/valid/);
    await expect(canvasElement.querySelector('.json-estimate')).toBeVisible();
  },
};
export const JsonInvalid: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('tab', { name: 'JSON' }));
    const input = canvas.getByRole('textbox', { name: /JSON/ });
    await userEvent.clear(input);
    await userEvent.type(input, 'broken json');
    await expect(canvasElement.querySelector('.json-validation')).toHaveClass(/invalid/);
    const save = canvas
      .getAllByRole('button')
      .find((b) => b.textContent?.includes('Enregistrer') || b.textContent?.includes('Save'))!;
    await expect(save).toBeDisabled();
  },
};
export const Saving: Story = { args: { saving: true } };

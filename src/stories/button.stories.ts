import { figmaParameters } from './figma';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { ButtonDirective } from '../app/ui/design-system/button';
import { IconComponent } from '../app/ui/icon';
import { TranslatePipe } from '../app/ui/language';

type ButtonArgs = {
  wwButton: 'primary' | 'secondary';
  wwButtonSize: 'regular' | 'small';
  label: string;
  disabled: boolean;
  icon: string;
  onPress: () => void;
};
const meta: Meta<ButtonArgs> = {
  title: 'Components/Button',
  component: ButtonDirective,
  decorators: [moduleMetadata({ imports: [ButtonDirective, IconComponent, TranslatePipe] })],
  args: {
    wwButton: 'primary',
    wwButtonSize: 'regular',
    label: 'Créer un scénario',
    disabled: false,
    icon: 'plus',
    onPress: fn(),
  },
  argTypes: {
    wwButton: {
      description: 'Visual priority: primary for the main action, secondary for supporting actions.',
      control: 'select',
      options: ['primary', 'secondary'],
    },
    wwButtonSize: {
      description: 'Regular control or compact small control.',
      control: 'select',
      options: ['regular', 'small'],
    },
    label: {
      description: 'Visible accessible label; French source messages use the production translation pipe.',
      control: 'text',
    },
    disabled: {
      description: 'Native disabled state prevents clicks and form submission.',
      control: 'boolean',
    },
    icon: { description: 'Decorative IconComponent name, or empty for text only.', control: 'text' },
    onPress: { description: 'Native click handler, logged in Actions.', action: 'pressed', control: false },
  },
  parameters: {
    ...figmaParameters('buttonPrimary'),
    docs: {
      description: {
        component:
          'Native button enhanced by ButtonDirective, used in the application and device editor. Keep type="button" for actions outside submission, type="submit" for form submission, and an accessible name for icon-only buttons.',
      },
    },
  },
  render: (args) => ({
    props: args,
    template: `<button type="button" [wwButton]="wwButton" [wwButtonSize]="wwButtonSize" [disabled]="disabled" (click)="onPress()">@if(icon){<ww-icon [name]="icon"/>}{{label | t}}</button>`,
  }),
};
export default meta;
type Story = StoryObj<ButtonArgs>;
export const Primary: Story = {
  parameters: figmaParameters('buttonPrimary'),
  play: async ({ canvasElement, args }) => {
    const button = within(canvasElement).getByRole('button');
    await userEvent.click(button);
    await expect(args.onPress).toHaveBeenCalledOnce();
    button.focus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onPress).toHaveBeenCalledTimes(2);
  },
};
export const Secondary: Story = {
  parameters: figmaParameters('buttonSecondary'),
  args: { wwButton: 'secondary', label: 'Ajuster mon tarif', icon: 'settings' },
};
export const Small: Story = {
  parameters: figmaParameters('buttonSmall'),
  args: { wwButton: 'secondary', wwButtonSize: 'small' },
};
export const Disabled: Story = {
  parameters: figmaParameters('buttonDisabled'),
  args: { disabled: true },
  play: async ({ canvasElement, args }) => {
    const button = within(canvasElement).getByRole('button');
    await expect(button).toBeDisabled();
    await userEvent.click(button);
    await expect(args.onPress).not.toHaveBeenCalled();
  },
};
export const TextOnly: Story = { parameters: figmaParameters('buttonTextOnly'), args: { icon: '' } };

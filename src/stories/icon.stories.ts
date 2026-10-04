import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { IconComponent, iconNames } from '../app/ui/icon';
const meta: Meta<IconComponent> = {
  title: 'Components/Icon',
  component: IconComponent,
  args: { name: 'bolt' },
  argTypes: { name: { control: 'select', options: iconNames } },
  parameters: {
    docs: {
      description: {
        component:
          'Production SVG icons, inheriting currentColor. Icons are decorative (aria-hidden); label the surrounding control rather than the SVG. Unknown names fall back to box.',
      },
    },
  },
};
export default meta;
type Story = StoryObj<IconComponent>;
export const Single: Story = {};
export const Fallback: Story = { args: { name: 'unknown-icon' } };
export const Catalogue: Story = {
  decorators: [moduleMetadata({ imports: [IconComponent] })],
  render: () => ({
    props: { names: iconNames },
    template: `<div class="ww-icon-grid">@for(name of names;track name){<div class="ww-icon-cell"><ww-icon [name]="name"/><code>{{name}}</code></div>}</div>`,
  }),
};

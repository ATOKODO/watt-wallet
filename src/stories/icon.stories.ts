import { figmaParameters } from './figma';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { IconComponent, iconNames } from '../app/ui/icon';
const meta: Meta<IconComponent> = {
  title: 'Components/Icon',
  component: IconComponent,
  args: { name: 'bolt' },
  argTypes: { name: { control: 'select', options: iconNames } },
  parameters: {
    ...figmaParameters('iconSingle'),
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
export const Single: Story = { parameters: figmaParameters('iconSingle') };
export const Fallback: Story = {
  parameters: figmaParameters('iconFallback'),
  args: { name: 'unknown-icon' },
};
export const Catalogue: Story = {
  parameters: figmaParameters('iconCatalogue'),
  decorators: [moduleMetadata({ imports: [IconComponent] })],
  render: () => ({
    props: { names: iconNames },
    template: `<div class="ww-icon-grid">@for(name of names;track name){<div class="ww-icon-cell"><ww-icon [name]="name"/><code>{{name}}</code></div>}</div>`,
  }),
};

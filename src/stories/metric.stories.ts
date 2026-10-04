import { type Meta, type StoryObj } from '@storybook/angular-vite';
import { MetricComponent } from '../app/ui/design-system/metric';
import { storyLanguage } from '../../.storybook/environment';
const meta: Meta<MetricComponent> = {
  title: 'Components/Metric',
  component: MetricComponent,
  args: {
    label: 'Consommation estimée',
    value: '8 420',
    unit: 'kWh',
    suffix: '/ an',
    hint: 'Une estimation, pas une facture.',
    tag: 'ANNUELLE',
    icon: 'bolt',
    tone: 'peach',
    highlighted: false,
  },
  argTypes: {
    tone: { control: 'select', options: ['peach', 'sage', 'cream'] },
    highlighted: { control: 'boolean' },
  },
  render: (args) => ({
    props: {
      ...args,
      label: storyLanguage.t(args.label),
      suffix: storyLanguage.t(args.suffix ?? ''),
      hint: storyLanguage.t(args.hint ?? ''),
      tag: storyLanguage.t(args.tag ?? ''),
    },
    template: `<article wwMetric style="max-width:430px" [label]="label" [value]="value" [unit]="unit" [suffix]="suffix" [hint]="hint" [tag]="tag" [icon]="icon" [tone]="tone" [highlighted]="highlighted"></article>`,
  }),
  parameters: {
    docs: {
      description: {
        component:
          'The three annual summary cards in the application use this presentational component. Values are already formatted; calculations and translations belong to the caller. unit, suffix and tag are optional.',
      },
    },
  },
};
export default meta;
type Story = StoryObj<MetricComponent>;
export const AnnualEnergy: Story = {};
export const AnnualBudget: Story = {
  args: {
    label: 'Budget électricité',
    value: '1 950 €',
    unit: '',
    hint: 'Dont 180 € d’abonnement.',
    tag: '',
    tone: 'sage',
    icon: 'chart',
  },
};
export const MonthlyAverage: Story = {
  args: {
    label: 'Chaque mois, en moyenne',
    value: '162,50 €',
    unit: '',
    suffix: '/ mois',
    tag: '',
    tone: 'cream',
    icon: 'leaf',
    highlighted: true,
  },
};
export const ZeroConsumption: Story = { args: { value: '0' } };
export const LargeValue: Story = { args: { value: '123 456' } };

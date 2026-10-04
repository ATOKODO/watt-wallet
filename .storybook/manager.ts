import { addons } from 'storybook/manager-api';
import { create } from 'storybook/theming';
addons.setConfig({
  theme: create({
    base: 'light',
    brandTitle: 'Watt Wallet · Design system',
    brandImage: 'brand.svg',
    brandUrl: '?path=/story/design-system--introduction',
    colorPrimary: '#315b43',
    colorSecondary: '#315b43',
    appBg: '#f7f8f3',
    appContentBg: '#fffefa',
    fontBase: 'Segoe UI, Arial, sans-serif',
  }),
});

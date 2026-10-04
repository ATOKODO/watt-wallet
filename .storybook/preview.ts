import { applicationConfig, componentWrapperDecorator, type Preview } from '@storybook/angular-vite';
import { applyTheme } from '../src/app/ui/theme';
import { accentPresets, defaultAccent } from '../src/app/ui/palette';
import { storyLanguage, storyProviders, storyTheme } from './environment';
import '../src/styles.css';
import './preview.css';

const preview: Preview = {
  tags: ['autodocs'],
  initialGlobals: { theme: 'light', accent: defaultAccent, language: 'fr' },
  globalTypes: {
    theme: {
      description: 'Application theme',
      toolbar: {
        title: 'Theme',
        icon: 'circlehollow',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
        dynamicTitle: true,
      },
    },
    accent: {
      description: 'Application accent palette',
      toolbar: {
        title: 'Palette',
        icon: 'paintbrush',
        items: accentPresets.map((p) => ({ value: p.color, title: p.name })),
        dynamicTitle: true,
      },
    },
    language: {
      description: 'Application language',
      toolbar: {
        title: 'Language',
        icon: 'globe',
        items: [
          { value: 'fr', title: 'Français' },
          { value: 'en', title: 'English' },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (story, context) => {
      storyLanguage.setLanguage(context.globals['language'] === 'en' ? 'en' : 'fr');
      storyTheme.theme.set(context.globals['theme'] === 'dark' ? 'dark' : 'light');
      storyTheme.accent.set(context.globals['accent'] ?? defaultAccent);
      applyTheme(storyTheme.theme(), storyTheme.accent());
      return story();
    },
    applicationConfig({ providers: storyProviders }),
    componentWrapperDecorator((story) => `<div class="ww-story">${story}</div>`),
  ],
  parameters: {
    layout: 'padded',
    controls: { expanded: true },
    options: {
      storySort: {
        order: [
          'Design system',
          ['Introduction', 'Colors', 'Typography', 'Spacing'],
          'Components',
          'Features',
        ],
      },
    },
    viewport: {
      options: {
        iphone: { name: 'iPhone 16 Pro', styles: { width: '402px', height: '874px' }, type: 'mobile' },
        ipad: { name: 'iPad Pro 11', styles: { width: '834px', height: '1194px' }, type: 'tablet' },
        desktop: { name: 'Desktop', styles: { width: '1512px', height: '982px' }, type: 'desktop' },
      },
    },
    a11y: { test: 'todo' },
    docs: {
      description: {
        component:
          'Watt Wallet production UI. Use the toolbar to inspect both themes, six palettes and French/English. Fixtures stay in memory; no application data is loaded or saved.',
      },
    },
  },
};
export default preview;

import type { StorybookConfig } from '@storybook/angular-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.ts'],
  addons: ['@storybook/addon-docs', '@storybook/addon-a11y'],
  framework: { name: '@storybook/angular-vite', options: { tsconfig: '.storybook/tsconfig.json' } },
  staticDirs: ['./public', '../public', { from: '../examples', to: '/fixtures' }],
  core: { disableTelemetry: true, enableCrashReports: false },
};
export default config;

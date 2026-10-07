import type { Config } from '@storybook/addon-designs';

// Canonical nodes verified with the Figma MCP on 05 · Components.
// Keep the stable IDs when refining variants; legacy screen masters stay archived.
export const figmaFileKey = 'PhlVkNsx0CCQVXAhQIHXss';
export const figmaReferences = {
  introduction: ['184:36819', 'Design system · Start here'],
  colors: ['184:36821', 'Semantic colors · Light / Dark'],
  typography: ['186:69', 'Shared typography'],
  spacing: ['186:76', 'Spacing and shape'],
  buttonPrimary: ['187:44', 'Action · Primary / Regular / Default'],
  buttonSecondary: ['187:76', 'Action · Secondary / Regular / Default'],
  buttonSmall: ['187:92', 'Action · Secondary / Small / Default'],
  buttonDisabled: ['187:56', 'Action · Primary / Regular / Disabled'],
  buttonTextOnly: ['203:3649', 'Action · without an icon'],
  metricEnergy: ['195:817', 'Metric · Energy'],
  metricBudget: ['195:827', 'Metric · Budget'],
  metricMonthly: ['195:837', 'Metric · Monthly'],
  metricZero: ['195:1586', 'Metric · zero consumption'],
  metricLarge: ['195:1598', 'Metric · large values'],
  iconSingle: ['186:113', 'Icon · Bolt'],
  iconFallback: ['186:191', 'Icon · Box'],
  iconCatalogue: ['184:36823', 'Complete production icon catalogue'],
  editorPower: ['199:1164', 'Device editor · Power'],
  editorCycle: ['199:1275', 'Device editor · Cycle'],
  editorAnnual: ['199:1385', 'Device editor · Annual'],
  editorInstalled: ['199:1479', 'Device editor · Installed'],
  editorJson: ['199:1597', 'Device editor · JSON valid'],
  editorJsonInvalid: ['199:1627', 'Device editor · JSON invalid'],
  editorSaving: ['199:1658', 'Device editor · Saving'],
  dioramaConsumption: ['199:2980', 'Diorama · Consumption'],
  dioramaPlacement: ['199:3031', 'Diorama · Placement'],
  dioramaEmpty: [
    '199:2980',
    'Diorama · component reference',
    'The empty home is a code fixture; Figma references the populated consumption composition.',
  ],
  dioramaZero: [
    '199:2980',
    'Diorama · component reference',
    'Zero-consumption markers are a code fixture; see Scene/Object label, State=Zero, in the Figma catalogue for the annotation state.',
  ],
  dioramaSelected: ['199:3082', 'Diorama · Selected'],
} as const;

export function figmaParameters(reference: keyof typeof figmaReferences) {
  const [nodeId, name, note] = figmaReferences[reference] as readonly [string, string, string?];
  const design: Config = {
    type: 'figma',
    name,
    url: `https://www.figma.com/design/${figmaFileKey}/watt-wallet?node-id=${nodeId.replace(':', '-')}`,
    allowFullscreen: true,
  };
  return { design: [design], ...(note ? { docs: { description: { story: note } } } : {}) };
}

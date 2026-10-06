import type { Config } from '@storybook/addon-designs';

// Existing nodes verified with the Figma MCP. Keep stable IDs when updating designs.
export const figmaFileKey = 'PhlVkNsx0CCQVXAhQIHXss';
export const figmaReferences = {
  introduction: ['31:2', 'Product overview'],
  colors: ['88:124317', 'Theme palette'],
  typography: ['31:230', 'Shared typography'],
  spacing: [
    '122:31008',
    'Control spacing and shape',
    'Figma references a production control using the shared tokens. The token scale itself is documented in this story; there is no dedicated spacing board.',
  ],
  buttonPrimary: ['122:31339', 'Primary button'],
  buttonSecondary: ['122:31008', 'Secondary button'],
  buttonSmall: ['125:154885', 'Compact secondary button'],
  buttonDisabled: [
    '122:31339',
    'Primary button · component reference',
    'Disabled is an interactive code state; Figma shows the enabled component reference.',
  ],
  buttonTextOnly: ['130:33183', 'Text-only primary button'],
  metricEnergy: ['122:32837', 'Annual energy card'],
  metricBudget: ['122:32853', 'Annual budget card'],
  metricMonthly: ['122:32865', 'Monthly average card'],
  metricZero: [
    '122:32837',
    'Energy card · component reference',
    'Zero consumption is a code fixture; Figma shows the energy card with demonstration values.',
  ],
  metricLarge: [
    '122:32837',
    'Energy card · component reference',
    'Large values are a code fixture; Figma shows the energy card with demonstration values.',
  ],
  iconSingle: ['66:32798', 'Bolt icon'],
  iconFallback: ['10:53', 'Box icon'],
  iconCatalogue: [
    '6:33',
    'Reusable icon and component library',
    'The Figma library contains reusable icons and historical component variants. The code catalogue is the current complete icon registry.',
  ],
  editorPower: ['125:142826', 'Profile form · power'],
  editorCycle: [
    '125:142826',
    'Profile form · component reference',
    'Cycle inputs are exercised in code; Figma references the same form with the power method selected.',
  ],
  editorAnnual: [
    '125:142826',
    'Profile form · component reference',
    'Annual inputs are exercised in code; Figma references the same form with the power method selected.',
  ],
  editorInstalled: ['125:148621', 'Installed device · power and usage'],
  editorJson: ['88:117312', 'JSON profile editor'],
  editorJsonInvalid: [
    '88:117312',
    'JSON editor · component reference',
    'Invalid JSON is an interactive code state; the Figma reference shows the valid JSON editor.',
  ],
  editorSaving: [
    '125:142826',
    'Profile form · component reference',
    'Saving is an interactive code state; the Figma reference shows the idle form.',
  ],
  dioramaConsumption: ['125:32072', 'Diorama · consumption'],
  dioramaPlacement: ['125:34099', 'Diorama · placement'],
  dioramaEmpty: [
    '125:32072',
    'Diorama · component reference',
    'The empty home is a code fixture; the Figma reference shows a populated consumption scene.',
  ],
  dioramaZero: [
    '125:32072',
    'Diorama · component reference',
    'Zero-consumption markers are a code fixture; the Figma reference shows a populated consumption scene.',
  ],
  dioramaSelected: ['125:146164', 'Diorama · selected device'],
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

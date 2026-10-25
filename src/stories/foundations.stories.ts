import { figmaParameters } from './figma';
import { Component, input } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular-vite';
import { accentPresets } from '../app/ui/palette';

@Component({
  selector: 'ww-foundations',
  standalone: true,
  template: ` <section class="ww-showcase">
    @if (section() === 'introduction') {
      <h1>Walletricity · Design system</h1>
      <p>
        A warm miniature home, calm surfaces and readable energy estimates. This catalogue renders the same
        Angular components, CSS tokens and palette functions as the application.
      </p>
      <h2>Explore and maintain</h2>
      <p>
        Start with Colors, Typography and Spacing. Components covers native buttons, icons and metric cards.
        Features covers the real device editor and Three.js diorama, including empty and invalid states.
      </p>
      <p>
        Use Theme, Palette and Language in the toolbar. Use Controls to change inputs and Actions to inspect
        outputs. Viewports include the application's mobile, tablet and desktop layouts. The Accessibility
        panel runs axe checks on rendered components; review findings in their context.
      </p>
      <h2>Source of truth</h2>
      <p>
        Tokens: src/app/ui/design-system/tokens.css. Shared styles: src/styles.css. Components: src/app/ui.
        Stories: src/stories. Configuration: .storybook. Change these production sources instead of copying
        styles into stories.
      </p>
      <h2>Data stays in memory</h2>
      <p>
        The editor and 3D view use an isolated fixture provider. They never open the application's IndexedDB
        database or save theme/language preferences.
      </p>
      <h2>Accessibility and meaning</h2>
      <p>
        Keep native button semantics and visible keyboard focus. Add labels to inputs and icon-only actions.
        Pair color with text. Energy volumes are estimates, and simulated watts must stay separate from annual
        kWh.
      </p>
    }
    @if (section() === 'colors') {
      <h1>Semantic palette</h1>
      <p>
        Switch theme and accent to see these live CSS variables change. Raw hex values belong in the
        palette/tokens, not in new component styles.
      </p>
      <div class="ww-story-grid">
        @for (token of colors; track token.name) {
          <article class="ww-token">
            <div class="ww-swatch" [style.background]="'var(' + token.name + ')'"></div>
            <strong>{{ token.role }}</strong
            ><code>{{ token.name }}</code>
          </article>
        }
      </div>
      <h2>Accent presets</h2>
      <div class="ww-story-grid">
        @for (preset of presets; track preset.name) {
          <article class="ww-token">
            <div class="ww-swatch" [style.background]="preset.color"></div>
            <strong>{{ preset.name }}</strong
            ><code>{{ preset.color }}</code>
          </article>
        }
      </div>
      <p>
        OKLCH hue/chroma tinting preserves each source color's lightness in both themes. The same palette
        function colors the Three.js scene. Status colors retain their meaning.
      </p>
    }
    @if (section() === 'typography') {
      <h1>Typography</h1>
      <p>
        Inter for the UI, Lora for headings and Roboto Mono for code. Bundled locally for offline use and
        shared with Figma.
      </p>
      <h1>Un petit monde. Une énergie plus claire.</h1>
      <h2>Votre logement en miniature</h2>
      <h3>Consommation &amp; usage</h3>
      <p>Body copy explains the assumptions behind the estimate in plain language.</p>
      <p class="subtle">Supporting text · average power, hours per day and annual use.</p>
      <p class="eyebrow">ANNUAL ESTIMATE</p>
      <div class="metric">
        <div class="metric-value">
          8 420 <span>kWh<span class="metric-suffix"> / an</span></span>
        </div>
        <p>Tabular figures for stable comparison.</p>
      </div>
    }
    @if (section() === 'spacing') {
      <h1>Spacing and shape</h1>
      <p>
        Use named tokens for shared controls and layout. Existing app-specific layouts retain their responsive
        rules.
      </p>
      <div class="ww-story-grid">
        @for (space of spaces; track space.name) {
          <article class="ww-token">
            <div [style.width]="'var(' + space.name + ')'" style="height:32px;background:var(--green)"></div>
            <code>{{ space.name }} · {{ space.value }}px</code>
          </article>
        }
      </div>
      <div class="ww-story-grid">
        <article class="ww-token" style="border-radius:var(--radius-control)">
          <strong>Control · 8px</strong><code>--radius-control</code>
        </article>
        <article class="ww-token"><strong>Card · 12px</strong><code>--radius-card</code></article>
      </div>
    }
  </section>`,
})
class FoundationsComponent {
  section = input('introduction');
  presets = accentPresets;
  colors = [
    { name: '--green', role: 'Primary action' },
    { name: '--deep', role: 'Strong accent / emphasis' },
    { name: '--muted', role: 'Muted accent' },
    { name: '--border', role: 'Surface borders' },
    { name: '--cream', role: 'Canvas / soft surface' },
  ];
  spaces = [
    { name: '--space-1', value: 4 },
    { name: '--space-2', value: 8 },
    { name: '--space-3', value: 12 },
    { name: '--space-4', value: 16 },
    { name: '--space-6', value: 24 },
    { name: '--space-8', value: 32 },
  ];
}
const meta: Meta<FoundationsComponent> = {
  title: 'Design system',
  component: FoundationsComponent,
  tags: ['!autodocs'],
  parameters: figmaParameters('introduction'),
  render: (args) => ({ props: args }),
};
export default meta;
type Story = StoryObj<FoundationsComponent>;
export const Introduction: Story = {
  parameters: figmaParameters('introduction'),
  args: { section: 'introduction' },
};
export const Colors: Story = { parameters: figmaParameters('colors'), args: { section: 'colors' } };
export const Typography: Story = {
  parameters: figmaParameters('typography'),
  args: { section: 'typography' },
};
export const Spacing: Story = { parameters: figmaParameters('spacing'), args: { section: 'spacing' } };

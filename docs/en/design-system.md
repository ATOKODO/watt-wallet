[English](../en/design-system.md) · [Français](../fr/design-system.md) · [Home](../../README.md)

# Design system and Storybook

Storybook is the interactive catalogue for Watt Wallet's production Angular UI. It combines visual foundations, editable component examples, automatic API documentation, output logs and accessibility inspection. It runs independently of the app, Tauri and the documentation website.

## Open the catalogue

```powershell
npm ci
npm run storybook
```

Open [http://127.0.0.1:6007](http://127.0.0.1:6007). The sidebar has three sections:

| Section       | Coverage                                                                                                                                                                                                |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Design system | Introduction, live semantic colors, six accents, typography, spacing and shape.                                                                                                                         |
| Components    | Native buttons, the complete SVG icon catalogue and annual/monthly metric cards.                                                                                                                        |
| Features      | The actual device editor with power/cycle/annual methods, instance editing, JSON validation and saving; the Three.js diorama with consumption, placement, selection, empty and zero-consumption states. |

Use **Theme**, **Palette** and **Language** in the toolbar to inspect light/dark, all six presets and French/English. **Controls** changes component inputs; **Actions** logs outputs such as submission, selection or grid arrangement. The viewport menu includes 402 × 874, 834 × 1194 and 1512 × 982. The foundations and developer descriptions are written in English; the production UI uses its real translation catalogue. User-entered strings, including preformatted metric values, remain unchanged.

The Accessibility panel uses axe to inspect rendered markup. Findings are advisory (`a11y.test: 'todo'`), not an assertion that every existing color/text combination passes WCAG. Check keyboard access, contrast and full application context as well.

## Shared sources

| Source                                | Purpose                                                                                |
| ------------------------------------- | -------------------------------------------------------------------------------------- |
| `src/app/ui/design-system/tokens.css` | Palette variables in both themes, font, spacing and radii.                             |
| `src/styles.css`                      | Production component styles and responsive rules, also imported by Storybook.          |
| `src/app/ui/palette.ts`               | Six accent presets, validation and shared OKLCH tinting for CSS/Three.js.              |
| `src/app/ui/design-system/button.ts`  | `ButtonDirective` on native buttons in the app and device editor.                      |
| `src/app/ui/design-system/metric.ts`  | `MetricComponent`, used by the three summary cards in the app.                         |
| `src/app/ui/icon.ts`                  | Icons and exported `iconNames`; the gallery follows the actual registry.               |
| `src/stories/*.stories.ts`            | Typed component examples and interaction assertions.                                   |
| `.storybook/`                         | Vite-based Angular framework, providers, global toolbar, viewports and preview layout. |

The app and Storybook share components and styles. Avoid maintaining a second visual implementation inside the catalogue. `ButtonDirective` preserves native click, keyboard, disabled and form behavior. `MetricComponent` takes already formatted/translated data and performs no calculations or persistence. A metric remains an `article` so existing layout and semantics are preserved.

Storybook 10.6.1 uses `@storybook/angular-vite` with Angular 22's zoneless rendering. This framework is currently a preview; versions are pinned and should be upgraded together, with build, type and browser checks. See the [official framework documentation](https://storybook.js.org/docs/get-started/frameworks/angular-vite).

## Shared typography

The app, Storybook and Figma use **Inter** for the UI, **Lora** for display headings and **Roboto Mono** for JSON/code. The tokens are `--font-ui`, `--font-heading` and `--font-mono`. WOFF2 files and their SIL Open Font License notices are bundled under `public/fonts/`. The app service worker prefetches them for offline use; Storybook serves the same files. No remote font service is contacted at runtime.

## Isolated data

`.storybook/environment.ts` replaces `WalletStore` with a small fixture provider. It supplies an in-memory asset repository and a demonstration home. It never constructs the real store or opens its IndexedDB workspace. Language and theme services reuse production formatting/palette behavior with session-only Signals; they do not overwrite application preferences.

Submitting the editor emits a validated draft into Actions. Imported GLB bytes remain in the fixture's memory. Moving or arranging the diorama emits positions into Actions; it does not save them. Three.js remains the real renderer, so WebGL is required for the scene, and the production fallback appears when it is unavailable.

## Add or change a component

1. Change the production tokens, styles or component. Keep visible focus, accessible labels and native semantics.
2. Add a typed `Meta` and `StoryObj` in `src/stories/<name>.stories.ts`, importing from `@storybook/angular-vite`.
3. Import standalone dependencies with `moduleMetadata` where a custom template needs them. For attribute selectors, supply an explicit template, as in the button/metric stories.
4. Define representative defaults, editable controls and `fn()` output handlers from `storybook/test`. Add important empty, disabled, busy or invalid states.
5. Add a `play` function for meaningful interactions with `userEvent` and `expect`. Reuse the isolated providers instead of enabling persistence.
6. Inspect both themes, languages and mobile layout, then run the checks below.

Autodocs is enabled globally for component stories. Foundations opt out and serve as visual guides. Static framework metadata can discover Inputs/Outputs; explicit `argTypes` documents extra template props and event handlers. Keep public component descriptions beside the production API or in story parameters.

## Build, verify and share

```powershell
npm run storybook:typecheck
npm run storybook:build
npm exec playwright install chromium
npm run test:storybook
npm test
npm run build
npm run format:check
```

The build outputs `storybook-static/`, ignored by Git. Serve the entire directory over HTTP/HTTPS, including `index.json`, `iframe.html` and `assets/`; do not open it with `file://`. No Storybook publication workflow is included: the existing Pages workflow still publishes only the documentation website. Storybook telemetry/crash reporting is disabled.

The browser check opens every story from the static index, waits for successful Storybook completion (including play assertions), visits autodocs and checks translations, palette, dark mode, WebGL, mobile JSON layout and storage isolation. Screenshots for inspection are written to the ignored `.cache/storybook-review/` directory. It uses isolated Chromium processes with software compositing and SwiftShader WebGL to avoid host GPU driver issues; this is not physical-device or native WebView2 testing. As with the other scripts, set `PLAYWRIGHT_BROWSERS_PATH` consistently if the runtime is installed in a custom cache.

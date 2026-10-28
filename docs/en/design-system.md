[English](../en/design-system.md) · [Français](../fr/design-system.md) · [Home](../../README.md)

# Design system and Storybook

Storybook is the interactive catalogue for Walletricity's production Angular UI. It combines visual foundations, editable component examples, automatic API documentation, output logs and accessibility inspection. It runs independently of the app, Tauri and the documentation website.

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

## Figma references

Select a story, then open **Design (1)** below the preview. `@storybook/addon-designs` embeds a named node from [05 · Components in the Walletricity Figma file](https://www.figma.com/design/PhlVkNsx0CCQVXAhQIHXss/watt-wallet?node-id=5-7). All 29 story references are centralized in `src/stories/figma.ts`.

The Figma page contains a review catalogue and a separate master area. It has **25 native component sets, 129 variants and 42 production SVG icons**:

| Family               | Contents                                                                                   |
| -------------------- | ------------------------------------------------------------------------------------------ |
| Foundations          | Semantic Light/Dark colors, six shared text styles, spacing and radii.                     |
| Buttons              | Action, Text, Icon, Add device, Header, Navigation, Segment, Power state and Scenario tab. |
| Fields and selection | Input, Select, Search, JSON, validation messages and six accent choices.                   |
| Cards and rows       | Metrics, library items, device rows, simulated power rows and scene annotations.           |
| Product patterns     | Device editor, diorama, tariff summary, library and scenario comparison.                   |

Variants describe appearance and state: size, style, hover, keyboard focus, disabled, selection or calculation method. Labels, metric values, device names and icons are instance properties, rather than duplicate variants for each piece of content. Icons use instance swaps; visibility properties can hide optional icons and hints. The review catalogue shows native instances in both variable modes. The static Three.js scene is a captured visual asset; its energy data and geometry are still owned by the application.

Use the component families on **05 · Components** for new designs.

| Stories                                   | Figma reference                                                              |
| ----------------------------------------- | ---------------------------------------------------------------------------- |
| Introduction, Colors, Typography, Spacing | Dedicated foundation boards.                                                 |
| Button                                    | Exact primary, secondary, compact, disabled and text-only examples.          |
| Metric                                    | Energy, budget, monthly, zero and large-value examples.                      |
| Icon                                      | Bolt, fallback box and the full 42-icon catalogue.                           |
| Device editor                             | Power, cycle, annual, installed, valid/invalid JSON and saving compositions. |
| Diorama                                   | Consumption, placement and selected-device compositions.                     |

These references do not provide automatic comparisons or live synchronization. Demonstration values and composition widths can differ from a story. Empty and zero-consumption **scenes** still link to the populated diorama reference; their story descriptions explain this. Zero-consumption **annotations** have a dedicated `Scene/Object label` variant. Changing the Storybook theme, language or palette does not change the linked Figma node.

### Embedded Figma login in Brave

The Angular preview remains local. The Figma panel needs an Internet connection and permission to view the file. A successful login in a separate popup does not guarantee the embedded frame can use that session: blocked third-party cookies can prevent it from recognizing the login.

1. Open Storybook at `http://127.0.0.1:6007`.
2. In Brave's lion icon (Shields), allow third-party cookies for this site.
3. Reload Storybook and reopen **Design (1)**.
4. If Figma asks to **Allow access**, allow the embedded content to use the session. You can also open the design in a separate tab to check file permissions.

See [Figma's embed help](https://help.figma.com/hc/en-us/articles/360051741274-Interact-with-embeds) and [Brave's site-specific cookie controls](https://support.brave.com/hc/en-us/articles/360022806212-How-do-I-use-Shields-while-browsing). No access token is stored and the integration does not change sharing permissions. The browser smoke check verifies every reference and the addon's actual embed target using a local network fixture; it does not verify remote Figma authentication.

Preserve canonical node IDs when refining a design. If a node is replaced, update `src/stories/figma.ts` and check the affected story's Design panel.

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

Storybook uses `@storybook/angular-vite` with Angular 22's zoneless rendering. Versions are pinned in `package.json`; upgrade them together and check the build, types and browser interactions. See the [official framework documentation](https://storybook.js.org/docs/get-started/frameworks/angular-vite).

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

The build outputs `storybook-static/`, ignored by Git. Serve the entire directory over HTTP/HTTPS, including `index.json`, `iframe.html` and `assets/`; do not open it with `file://`. Publish Storybook separately from the documentation site; the Pages workflow deploys `docs/.vitepress/dist`. Storybook telemetry/crash reporting is disabled.

The browser check opens every story from the static index, waits for successful Storybook completion (including play assertions), visits autodocs and checks translations, palette, dark mode, WebGL, mobile JSON layout and storage isolation. Screenshots for inspection are written to the ignored `.cache/storybook-review/` directory. It uses isolated Chromium processes with software compositing and SwiftShader WebGL to avoid host GPU driver issues; this is not physical-device or native WebView2 testing. As with the other scripts, set `PLAYWRIGHT_BROWSERS_PATH` consistently if the runtime is installed in a custom cache.

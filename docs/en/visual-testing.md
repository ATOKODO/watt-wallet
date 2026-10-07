[English](../en/visual-testing.md) · [Français](../fr/visual-testing.md) · [Home](../../README.md)

# Visual regression with Playwright

These tests compare the rendered application and Storybook against reviewed PNG references committed in `visual/baselines/`. They complement the unit tests and functional journeys. The older `docs/screenshots/` galleries are presentation assets, not regression references.

## Run the comparisons

Use Node and npm as described in the [developer guide](development.md). Install Chromium once:

```powershell
npm ci
npm exec playwright install chromium
npm run visual:typecheck
npm run test:visual
npm run test:visual:report
```

The command rebuilds Angular and Storybook, then starts dedicated static servers on ports **4310** and **4311**. Keep those ports free. It does not reuse the application on 4200 or Storybook on 6007. The test servers shut down after the run. No development server needs to be started manually.

A missing reference or an excessive pixel difference fails the run. Comparison mode never creates or overwrites references. The HTML report in `playwright-report/visual/` shows expected, actual and difference images. Failure artifacts and traces are stored in `test-results/visual/`; both folders are ignored by Git.

## Coverage

| Area                        | Coverage                                                                                                                                                                                                              |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Responsive application      | 402 × 874, 834 × 1194, 1512 × 982 and 1920 × 1080; each in French/English and light/dark. Home, real WebGL diorama and valid JSON editor.                                                                             |
| Feature details             | Mobile and desktop in French/light and English/dark: scenario/category comparison, device inspector, simulated power, HP/HC tariff, palette dialog and full device library.                                           |
| Special states              | Empty home on desktop; WebGL unavailable and accessible device list on mobile.                                                                                                                                        |
| Currency and mobile library | Euro/dollar controls on mobile and desktop in French/light and English/dark; library order, search state and overflow across responsive breakpoints.                                                                  |
| Storybook                   | Every current story at 1200 × 900 in French/light/forest and English/dark/lavender, after its play assertions finish. Includes foundations, buttons, icons, cards, forms, JSON errors, saving and all diorama states. |

The Storybook inventory test fails when a story is added or removed without updating `visual/storybook.visual.spec.ts`. Some feature tests intentionally skip intermediate viewports; the responsive cases still run on all four.

Home shots capture the viewport. Detail shots capture the whole selected component (which can be taller than the viewport), and JSON/palette/tariff shots include the real modal and backdrop. The WebGL canvas is compared, not masked or replaced. These are Chromium layout checks, not tests on physical Apple hardware, Safari or native WebView2.

## Latest local verification

On **7 October 2026**, `npm run test:visual` rebuilt both targets and completed on Windows: **86 passed, 17 intentionally skipped**, with the 138 existing PNG references unchanged. The 147 documentation screenshots were also checked against fresh captures; 24 were refreshed to include the currency button in the header and modal backdrops. This local check does not validate the GitHub Actions runner or native WebView2.

## Reproducibility

The fixture creates a separate Chromium process and storage context for each test. It seeds IndexedDB **before Angular starts**, with fixed device identifiers and an independent savings scenario. Theme, accent, language and generated UUIDs are controlled. It never loads the user's application data.

Tests block service workers, use a pixel ratio of 1, reduced motion, software compositing and SwiftShader WebGL. They wait for fonts, saved state, labels, completed Storybook interactions and a settled page. Hover and caret effects are cleared before comparison; screenshot animations are disabled. A missing WebGL render fails the normal 3D cases rather than silently accepting a fallback.

Comparisons allow at most **100 changed pixels**, with a per-pixel color threshold of **0.15**. Icon stories allow zero changed pixels to protect small glyphs. They also fail on horizontal overflow or uncaught browser errors. Playwright waits for stable consecutive images. See the [official visual comparison guide](https://playwright.dev/docs/test-snapshots).

References are separated by platform and project: `visual/baselines/win32/app-iphone/app.visual.spec.ts/`, for example. The supplied references were generated locally on Windows with the Chromium version installed from the npm lockfile. Fonts and rendering differ between operating systems; Linux/macOS need their own reviewed references. Keep npm lockfile/browser versions and the capture environment consistent. Windows CI can still expose differences from the local Windows environment; inspect those differences instead of automatically accepting them.

## Review an intentional change

First run comparison mode and inspect the report. If the UI change is intentional, update only the affected tests:

```powershell
npm run test:visual:update -- --project=app-iphone --grep "responsive fr light"
npm run test:visual:update -- --project=storybook --grep "components-button"
```

For a deliberate full refresh:

```powershell
npm run test:visual:update
```

Review every changed PNG in the Git diff or an image viewer. Check layout, text, clipping, contrast, modal alignment and 3D content. Commit the approved references with the corresponding source change, then rerun `npm run test:visual` without updating. Do not regenerate references just to make an unexpected failure green.

For a faster comparison after both builds are already current:

```powershell
npm exec playwright test -- -c playwright.visual.config.ts --project=app-desktop
```

This direct command deliberately skips rebuilding. The usual npm script always builds first. Custom `PLAYWRIGHT_BROWSERS_PATH` must match the path used to install Chromium; see the [cache instructions](development.md).

## GitHub Actions

`.github/workflows/visual-regression.yml` runs on relevant pull requests and manual dispatch, using Windows 2025 and `npm ci`. It checks types, builds both targets and compares references without updating them. The HTML report, diffs and traces are uploaded as `visual-regression-report` for 14 days, including on failure.

The workflow is provided in the repository; a local run does not validate the hosted runner or publish anything. Changes to browser versions, fonts or runner images require an intentional comparison and review of references.

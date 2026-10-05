[English](../en/development.md) · [Français](../fr/development.md) · [Home](../../README.md)

# Developer guide

Watt Wallet is an Angular 22 application using standalone components, reactive forms and Signals. Three.js renders the diorama directly. Tauri 2 supplies the Windows shell and native persistence. The domain is independent of Angular and the renderer; there is no backend service or telemetry.

## Prerequisites and setup

Use Node **24.15+ on the 24.x branch** and npm. The recorded local validation used Node 24.20. Install the locked dependencies with `npm ci`.

For Windows desktop work, use Rust stable with the MSVC toolchain, Visual Studio C++ Build Tools with the C++ desktop tools, Windows SDK and WebView2. Windows x64 is the validated native target. macOS/Linux installers are not part of the current delivery.

```powershell
npm ci
npm start
```

The web development server listens on [http://127.0.0.1:4200](http://127.0.0.1:4200). To run Tauri, stop a manually started development server and use:

```powershell
npm run desktop
```

Tauri runs the configured `beforeDevCommand` itself. Opening the normal application reads its local workspace. Use the isolated automated test profiles for destructive test data rather than a personal workspace.

## Builds and offline behavior

```powershell
npm run build
npm run desktop:build
```

The web build is produced in `dist/watt-wallet/browser`. Serve it with a static HTTP server on localhost or HTTPS, with an SPA fallback to `index.html` if the hosting setup needs one. Do not open it with `file://`.

The production browser app registers an Angular service worker immediately. Its prefetch group includes the app shell, JavaScript, CSS, favicon and web manifest. After a complete initial load and installation, the same origin can reopen offline. Development mode and Tauri disable the browser service worker. Workspace data remains separate for every browser origin/profile.

The Windows command builds the frontend and creates an NSIS installer in `src-tauri/target/release/bundle/nsis`, currently named `Watt Wallet_0.1.0_x64-setup.exe`. The installer is per-user, in French, and not commercially code-signed. It downloads WebView2 when absent; that path requires internet. Application languages remain French/English.

Angular critical CSS inlining is disabled because its deferred stylesheet `onload` handler conflicts with Tauri's script CSP. Styles load as external stylesheets while the script policy remains strict. Native WebView file-drop interception is disabled so HTML device drag-and-drop works on Windows; dedicated file selectors handle imports.

## Architecture and data flow

| Area               | Responsibility                                                                                                             |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| `src/app/domain`   | Zod/TypeScript contracts, annual energy, tariff calculation, comparisons, temporary power estimates and generic seed data. |
| `src/app/data`     | Workspace repositories, native/browser file selection, `.wattpack` validation and GLB checks.                              |
| `src/app/state.ts` | Signal-based workspace state, derived results, validated mutations and serialized save operations.                         |
| `src/app/scene`    | Built-in silhouettes, validated GLB loading, adaptive grid, camera and pointer interactions.                               |
| `src/app/ui`       | Device editor, icons, translation, theme and palette services.                                                             |
| `src-tauri/src`    | Native workspace/asset operations, atomic replacement and concurrent-writer protection.                                    |

Forms produce validated profiles, usage or tariffs. The store copies the workspace before a mutation, validates it, updates its Signals and queues persistence. Derived calculations feed the UI and scene. Three.js never supplies the authoritative energy or equipment data.

Core contracts are `DeviceDefinition`, `DeviceInstance`, `UsageProfile`, `Tariff`, `Home`, `Scenario` and `CalculationResult`. An instance embeds a snapshot of its profile; scenarios embed their devices and tariff. See [the exchange contract](wattpack.md) and [calculation rules](calculations.md).

The domain entry points include `annualBreakdown(device)`, `calculate(snapshot)`, `compare(reference, scenario, initialCost)` and `powerEstimate(device, state)`. Calculation results are recomputed, not persisted. Simulation states are UI/session state, keyed by home, reference/scenario and device identity; they are not part of the public pack.

The orthographic scene normalizes model bounds. Grid spacing uses displayed X/Z footprints, and the board bounds adapt to object count and positions. Rendering is requested for updates, interactions and controls rather than an unconditional idle animation loop. Built-in resources are shared; removed model resources are released by the scene.

## Persistence, assets and recovery

| Environment    | Storage                                                                                                  |
| -------------- | -------------------------------------------------------------------------------------------------------- |
| Browser        | IndexedDB database `watt-wallet`, stores `workspace` and `assets`; workspace key `current`.              |
| Windows        | Application data directory for `app.wattwallet.desktop`, containing `workspace.json` and `assets/*.glb`. |
| UI preferences | Local storage keys `watt-wallet-language`, `watt-wallet-theme`, `watt-wallet-accent`.                    |

The repository interface provides `load`, `save`, `getAsset` and `putAsset`. Native storage uses Tauri commands; browser storage uses IndexedDB transactions. Native JSON replacement writes a temporary file beside the destination, synchronizes it and replaces the destination atomically.

Saving compares the expected previous workspace with the stored version. Browser transactions and a native shared-writer lock protect against stale writes. `WorkspaceConflictError` blocks subsequent changes until explicit recovery. The current local copy stays available for export; reloading discards unsaved local changes after confirmation. Loading errors do not seed over an unreadable existing save.

Normal save failures retain the in-memory changes and offer a retry. Creation/import dialogs reuse their identities and prepared asset mappings on retry so that failure does not multiply homes, scenarios or GLB resources. A fresh confirmed import still creates new copies intentionally.

Imported GLB bytes are retained unchanged and exported only when referenced by the pack. Replacing/removing a visual does not compact local asset storage in V1. A home pack is not a full workspace backup: unused library profiles, other homes and UI preferences require separate handling.

## Translation and appearance

The app starts in French unless English was saved locally. `LanguageService` exposes a language Signal, `en-GB`/`fr-FR` number formatting and EUR formatting. The English catalogue is `src/app/ui/i18n/en.json`, keyed by the French source messages. The standalone `t` pipe handles visible text, accessible attributes and parameterized messages such as `{0}`.

When adding user-facing text, use the French source string and add its English catalogue entry. Include accessible names, validation errors and notifications. Do not translate identifiers, JSON fields, category enum values or user-entered names and notes. Unmodified built-in profile names are localized for display while custom content is preserved. Language tests check catalogue coverage and behavior.

Theme defaults to the system preference; an explicit choice overrides it locally. Palette colors tint surfaces, controls and the board in both modes. Keep product text independent of implementation details and preserve contrast in light/dark views.

## Tests and checks

```powershell
npm test
npm exec playwright install chromium
npm run test:e2e
cargo test --manifest-path src-tauri/Cargo.toml
npm run format:check
npx prettier --check README*.md docs/en docs/fr
```

The last command includes the bilingual guides and French README, which are outside the existing `format:check` script's top-level documentation patterns. Playwright starts or reuses the server on port 4200 and runs with one worker. Failures retain screenshots/traces in `test-results/`; some journeys also write named verification screenshots there.

After building, use isolated production/native smoke tests:

```powershell
npm run build
npm run test:offline
npm run desktop:build
npm run test:native
```

The offline script serves the production build on port 4301 and checks reload, storage, English and 3D with no external requests. Native tests use a hidden window with `--smoke-test` and `WATT_WALLET_SMOKE_DIR` to isolate the workspace and WebView2 profile; this mode is inactive during normal launches.

For an installed-binary check on Windows:

```powershell
powershell -NoProfile -File scripts/installer-smoke.ps1
```

This installs the built NSIS package in a unique `.cache/installer-smoke-*` folder without shortcuts, verifies the executable's SHA-256 after normalizing only Tauri's reserved NSIS marker, runs the real WebView2 checks, then uninstalls the temporary package. It refuses to run if Watt Wallet is already installed for the current account.

If caches must stay in the repository workspace, set these before installing/downloading their dependencies:

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path (Get-Location) '.cache/playwright'
$env:CARGO_HOME = Join-Path (Get-Location) '.cache/cargo'
npm exec playwright install chromium
```

See [the historical verification report](verification.md) for recorded results, dates and native coverage limitations. It is not an assertion that tests ran again for every documentation update.

## Examples and feature screenshots

```powershell
npm run examples
```

This regenerates the public JSON schema and demonstration `.wattpack` files, with readable `.manifest.json` counterparts for the library and home. It writes tracked artifacts, so review the diff when intentionally updating the format or examples.

Start the application first, then run the capture commands in another terminal with the Playwright runtime available:

```powershell
node scripts/screenshots-mobile.mjs
node scripts/screenshots-devices.mjs
node scripts/screenshots-devices.mjs ipad-pro-11 en
```

| Series          | Viewport    | Languages                                        |
| --------------- | ----------- | ------------------------------------------------ |
| iPhone 16 Pro   | 402 × 874   | Legacy French journey with a final English view. |
| iPad Pro 11″    | 834 × 1194  | Separate French and English series.              |
| MacBook Pro 14″ | 1512 × 982  | Separate French and English series.              |
| Desktop         | 1920 × 1080 | Separate French and English series.              |

The shared capture helper uses isolated demonstration contexts, a pixel ratio of 1 and 21 feature captures per series. Outputs are PNGs plus a gallery, README and manifest under `docs/screenshots`. Optional device identifiers are `ipad-pro-11`, `macbook-pro-14` and `desktop`; optional language is `fr` or `en`. `WATT_WALLET_URL` changes the target URL. `WATT_WALLET_SOFTWARE_GPU=1` enables the larger-series script's software WebGL option when needed.

The scripts wait for fonts and UI settling, check PNG dimensions and horizontal overflow, and the shared helper rejects WebGL fallback captures. They write tracked image/documentation files. Inspect the [galleries](../screenshots/README.md) after regeneration. Viewport names describe layouts, not native Safari, iOS or macOS test coverage.

## Documentation website

The documentation is a separate static VitePress site; it does not read application data or require Angular or Tauri to run. The same Markdown files in `docs/en/` and `docs/fr/` work on GitHub and in the site. The renderer adapts repository links to downloadable assets and browser routes without changing the source guides. Navigation, search and appearance are configured in `docs/.vitepress/config.mts` and `docs/.vitepress/theme/`. The VitePress version is pinned in `package.json`; check the build and navigation when upgrading it.

```powershell
npm run docs:dev
```

Open [English](http://127.0.0.1:5173/en/) or [Français](http://127.0.0.1:5173/fr/). The development server reloads after Markdown changes. It can run alongside the application on port 4200. The sidebar links directly to each feature; the header provides language selection, local search and a theme switch. These documentation preferences are independent of the application.

```powershell
npm run docs:build
npm run test:docs -- --static
npm run test:docs
npm run docs:preview
```

The build produces `docs/.vitepress/dist`; preview listens on [http://127.0.0.1:4173](http://127.0.0.1:4173). `scripts/docs-assets.mjs` copies the screenshots, HTML galleries, examples, JSON schema and favicon before development/build into an ignored public directory. No duplicate source assets need to be maintained. Deploy the entire output folder. The documentation does not install the application's offline service worker.

The static check verifies generated internal links, anchors and assets. The full check additionally uses an isolated Chromium context to verify French/English navigation, search, language switching, themes, package downloads and mobile navigation. Install its runtime with `npm exec playwright install chromium` if needed. Inspection screenshots go into the ignored `.cache/docs-review/` folder. Check formatting with:

```powershell
npx prettier --check README*.md docs/en docs/fr docs/index.md docs/.vitepress/config.mts docs/.vitepress/theme scripts/docs-*.mjs .github/workflows/docs-pages.yml
```

### GitHub Pages

The included `.github/workflows/docs-pages.yml` builds, checks links and publishes the documentation after relevant changes are pushed to `master`, or when started manually from Actions. In the repository's **Settings → Pages → Build and deployment → Source**, select **GitHub Actions** before running it. Adding the workflow locally does not publish a site or change repository settings. See [GitHub's custom Pages workflow instructions](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) and the [VitePress deployment guide](https://vitepress.dev/guide/deploy).

The workflow supplies the actual Pages base path through `DOCS_BASE_PATH`, including a repository subpath or a custom domain's root. The site uses explicit `.html` routes so direct guide links do not need an SPA fallback. To check a repository subpath locally, use the same base for build, tests and preview:

```powershell
$env:DOCS_BASE_PATH = '/watt-wallet/'
npm run docs:build
npm run test:docs
npm run docs:preview
```

Open `http://127.0.0.1:4173/watt-wallet/fr/` or its English counterpart. After stopping preview, use `Remove-Item Env:DOCS_BASE_PATH` and rebuild to return to root-path hosting. The default base is `/`. This site publishes documentation and downloadable examples; the Angular application has its own build and hosting requirements.

## Design system and components

See the [Storybook guide](design-system.md) for the shared tokens, production component catalogue, isolated data providers and interaction checks. Start the catalogue with `npm run storybook` on port 6007; build it with `npm run storybook:build`.

## Visual regression

Run `npm run test:visual` to compare the application and Storybook against committed PNG references. Inspect differences with `npm run test:visual:report`; intentionally approve changes using `npm run test:visual:update`. See the [visual regression guide](visual-testing.md) for viewports, themes, fixture isolation, Windows references and GitHub Actions.

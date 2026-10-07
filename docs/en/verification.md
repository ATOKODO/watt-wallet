[English](../en/verification.md) · [Français](../fr/verification.md) · [Home](../../README.md)

# Verification and known limits

Local validation completed on **1 October 2026** on Windows x64, using Node 24.20, Angular 22.1.7, Three.js 0.186 and Tauri 2.

This report preserves the historical results of that validation. Updating the documentation does not mean these checks were run again or that another binary was validated.

## Review before human testing — 7 October 2026 {#review-before-human-testing-7-october-2026}

The current version is a candidate for a first human testing session: no blocking failure was found in the local checks below. This is a local Windows/Chromium review, not a certification of every platform or the hosted CI runner. Follow the [human testing journey](human-testing.md) for the remaining manual checks.

| Check                        | Current local result                                                                                                                                                                                                |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit tests                   | 84 passed across 8 files.                                                                                                                                                                                           |
| Chromium end-to-end journeys | 27 passed, including scenario removal, mobile layout, storage conflicts, GLB exchange and persistent EUR/USD selection.                                                                                             |
| Rust persistence tests       | 3 passed; Rust formatting passed.                                                                                                                                                                                   |
| Visual regression            | 86 passed, 17 intentionally skipped by viewport; all 138 committed PNG references remain unchanged. Real WebGL is compared in the 3D cases.                                                                         |
| Storybook                    | Type checking and all 29 story smoke checks passed.                                                                                                                                                                 |
| Web build and offline smoke  | Production build passed; cached English app, IndexedDB and real 3D reopened without external requests.                                                                                                              |
| Windows delivery             | Fresh NSIS build, isolated installation, installed WebView2 smoke, restart and uninstall passed. Currency persistence after restart is now explicitly tested, without changing saved numeric amounts or annual kWh. |
| Documentation site           | 39 HTML pages and 1,606 local links, assets and anchors checked; browser navigation passed both at `/` and under the GitHub Pages path `/watt-wallet/`.                                                             |
| Exchange examples            | All three example packages validated, imported and survived export/reopen; original GLB bytes preserved. Six documentation JSON examples validated and the public schema matches runtime validation.                |

The documentation contains **147 presentation PNGs** in seven series at four viewport sizes. They were compared against fresh captures on the current UI; 24 header/backdrop images were refreshed for the currency button. The current production asset fingerprints remain `main-BSCQTZQP.js` and `styles-J6DM3ODP.css`. The galleries are separate from visual regression references. See the [visual testing guide](visual-testing.md) and [screenshot index](../screenshots/README.md).

Figma was checked against the code and Storybook mappings. All **84 presentation screens** now inherit the currency control from 24 updated shared header masters. The design system contains 25 component sets, 129 variants and 42 icon components. All 29 Storybook references resolve to existing nodes. Empty and zero-consumption diorama stories intentionally link to an annotated populated design reference; they remain executable code fixtures rather than separate matching Figma screens. Brave's embedded Figma authentication still depends on browser permissions and is not covered by these checks.

Current build artifacts, replacing the historical delivery below:

- Installer: `src-tauri/target/release/bundle/nsis/Watt Wallet_0.1.0_x64-setup.exe`, **2,806,521 bytes**.
- Installer SHA-256: `FB6479FD9B1BFBE6D9C222215C56C838479586064A6F8CB685C54357BB05530E`.
- Normalized installed binary SHA-256: `de728f599b29bb77f6043ce83ffebc55bde4679c845424650726fb805c119154`.

Still to check with people: native import/export selectors and cancellation, physical mobile devices and Safari, usability and keyboard comfort. The installer remains unsigned; bootstrapper download on a machine without WebView2 was not exercised. Storybook accessibility checks are advisory, not a WCAG audit. Local results do not establish a successful GitHub Actions run. The dated 1 October results and hashes below are retained as history.

## Recorded results

| Check                                  | Result                                                                                                                                                  |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Angular production build               | Passed; `dist/watt-wallet/browser`.                                                                                                                     |
| Vitest unit tests                      | 83 passed.                                                                                                                                              |
| Playwright Chromium journeys           | 23 journeys checked: 22 in the full review, then 4 targeted GLB journeys including 1 new journey.                                                       |
| Offline production SPA                 | English reload, IndexedDB and 3D scene checked; no external requests.                                                                                   |
| Rust persistence and concurrency tests | 3 passed.                                                                                                                                               |
| Prettier formatting                    | Passed.                                                                                                                                                 |
| Windows build and NSIS packaging       | Passed.                                                                                                                                                 |
| Temporary NSIS installation            | Passed, without shortcuts.                                                                                                                              |
| Installed binary integrity             | SHA-256 verified after normalizing only Tauri's reserved injected NSIS marker.                                                                          |
| Installed application, real WebView2   | Persistent French/English, dark mode, persistent palette, 3D, adaptive board, orbit, grid, JSON, scenarios, simulated power and bill benchmark checked. |
| Native restart                         | Saved data reopened; language, palette and bill benchmark retained; simulation states reset.                                                            |
| Test uninstall                         | Passed; executable and Windows uninstall entry removed.                                                                                                 |

## Coverage and regressions

The twenty-three browser journeys cover drag-and-drop, direct movement and orbit; profiles, quantities, peak/off-peak tariffs, scenarios and imports into an empty profile; WebGL fallback and narrow screens; and a custom GLB shared with a home and its copies. The power journey checks that watts change without changing annual kWh, scenarios have separate temporary states, and the bill benchmark survives reload and `.wattpack` exchange.

The existing 22 Chromium journeys passed a full run in the last review. After the GLB budget correction, the four affected journeys were run again, including a new pre-storage rejection and translated-error journey. Assertions allow 15 seconds for software WebGL. The language journey waits for applied changes before entering another draft; the flat demo GLB is checked in Placement mode so it stays in frame.

Palette coverage includes presets and custom colors, persistence across light/dark mode, button contrast with vivid colors and the mobile editor. WebView2 checks actual surface changes and the palette after restart.

The adaptive board is checked with 120 devices: arrangement without overlap, positions beyond the old bounds, export/import, reload and framing on desktop/mobile. Unit tests also cover 500 elongated objects and limits on grid guides. WebView2 checks the enlarged board, saved positions and restart in an isolated temporary profile.

Language journeys check French/English labels, accessible attributes, number formats, forms and JSON errors, peak/off-peak tariffs and scenarios, search and filters, preservation of personal names/notes and current drafts, persistence after reload, keyboard selection and mobile layout. Catalogue checks cover static template text and built-in silhouettes. Production remains in English after an offline reload; native testing also checks language after restart.

Review regressions are covered: a usage draft stays intact during arrangement, updated positions survive applying and reloading, two tabs refuse a concurrent overwrite and allow explicit recovery, a rejected profile keeps its form and shows no success, rejected imports write no GLB, and snapping avoids footprints outside the grid. Accessible English catalogue labels are checked too.

Unit tests cover refused mutations, save serialization, storage errors and write blocking after conflict. They also check exchange of a manifest over 2 MiB, a home name at the 100-character boundary, and the unchanged 100 MiB / 200-entry limits. The three Rust tests cover atomic replacement, stale-copy rejection and the lock shared by concurrent writers. Installed WebView2 testing reproduces an IPC conflict, verifies the saved data stays intact and confirms draft preservation during arrangement.

Storage retry coverage uses two successive failures: homes and scenarios retain their identities, corrected names and local edits. Home imports with a scenario and library imports reuse their IDs and original GLB, including after an asset-write failure. A fresh request after closing creates a separate copy. Data and assets are checked after reload. The installed Windows app test temporarily marks the save file read-only to cause two real atomic-replacement errors, then checks duplicate-free retry and reload.

GLB loading checks a conservative 64 MiB budget before Three.js. Tests reject files under 1 KiB that declare over 100 MB of decoded attributes; a spy verifies the Three.js parser is never called. Coverage includes sparse or bufferless accessors, shared binary views, the exact boundary and matrices. Ordinary interleaved buffers and small sparse models remain accepted. The browser journey checks rejection from a profile and a pack, no local write, preserved form data and the English message.

Two Windows-specific runtime issues were fixed before delivery: CSS loading under strict CSP and native interception of drag-and-drop. The native test explicitly checks both behaviors.

## Artifacts

- Installer: `src-tauri/target/release/bundle/nsis/Watt Wallet_0.1.0_x64-setup.exe`, 2,477,381 bytes.
- Installer SHA-256: `1AB4F9B593E58BD7848806EAA6AB86FF7930F4C7A70208A43EDD72575B67E33E`.
- Normalized installed binary SHA-256: `1dafa1e793fad21b8fdb1c04001e7c0be4068f7e6604aadad4327494a9ed53ac`.
- Test captures: `test-results/watt-wallet-desktop.png`, `test-results/watt-wallet-mobile-fallback.png`, `test-results/watt-wallet-native.png`, `test-results/watt-wallet-dark.png`, `test-results/watt-wallet-dark-json-mobile.png`, `test-results/watt-wallet-power.png`, `test-results/watt-wallet-power-mobile.png`, `test-results/watt-wallet-palette-light.png`, `test-results/watt-wallet-palette-dark.png`, `test-results/watt-wallet-palette-mobile.png`, `test-results/watt-wallet-adaptive-board.png`, `test-results/watt-wallet-adaptive-board-mobile.png`, `test-results/watt-wallet-english-dark.png`, `test-results/watt-wallet-language-mobile.png` and `test-results/watt-wallet-native-english.png`.
- Format documentation: [version 1 guide](wattpack.md), [schema](../wattpack.schema.json) and [examples](../../examples/). The former `docs/wattpack.md` address remains an entry point.

## Validation limits

The installer is unsigned. WebView2 was already present on the test machine: downloading its runtime on a clean machine was not tested. Native file selectors use the official Tauri plugins; their interactive manipulation is not automated by the native test. Import/export journeys and custom assets are checked in Chromium.

Presentation images in the [screenshot index](../screenshots/README.md) use Chromium with iPhone, iPad, MacBook and desktop viewports. They demonstrate responsive layouts, without physical Apple-device or Safari validation. The build artifacts and test captures listed above are generated files, not guaranteed to be present in a fresh clone.

## V1 feature boundaries

There is no online catalogue, account system, cloud synchronization, Linky, live measurement, photo recognition, geometry editor, thermal simulation or calendar tariff such as Tempo. Initial profiles are generic and prices are entered manually. The power simulator does not measure peaks or installation capacity. Removed GLB resources may remain in local storage, without a compaction command.

See the [user guide](user-guide.md) for backups and troubleshooting, [calculations](calculations.md) for assumptions and [developer guide](development.md) to reproduce the checks.

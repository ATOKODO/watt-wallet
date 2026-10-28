[English](../en/verification.md) · [Français](../fr/verification.md) · [Home](../../README.md)

# Verification and known limits

This page describes the test suites and the application's limits. For setup and commands, see the [developer guide](development.md#tests-and-checks). Use the [manual testing guide](human-testing.md) to check complete workflows and report problems.

## Automated test coverage

| Suite                             | Coverage                                                                                                                                                                                       |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit tests (`tests/`)             | Energy formulas, standby, quantities, tariffs, comparisons, simulated power, validation, import/export, storage failures, grid layout, translations and palette colors.                        |
| Browser journeys (`e2e/`)         | Profiles and JSON, devices, scenarios, 3D controls, mobile layout, WebGL fallback, persistence, concurrent tabs, recovery after storage errors, GLB exchange, language, currency and licences. |
| Production offline check          | Complete service-worker cache, offline reload, local data, fonts, 3D and licence notices. The `--slow-prefetch` option exercises an incomplete cache before disconnection.                     |
| Rust and installed Windows checks | Atomic saves, stale-write rejection, WebView2 behavior, persistence after restart, isolated installation and uninstallation.                                                                   |
| Storybook                         | Component interactions, themes, translations, editor states, 3D, storage isolation and Figma embed targets using local network fixtures.                                                       |
| Visual regression                 | Application and Storybook screenshots across the configured viewports, languages and themes. See the [visual testing guide](visual-testing.md).                                                |
| Documentation                     | Internal links, anchors, assets, navigation, language switching, search and downloadable examples.                                                                                             |

Browser journeys and visual comparisons use Chromium. Their viewport sizes describe layouts, not physical devices. Test Safari, other browser engines and touch interactions on the target devices when checking compatibility.

Native file-dialog selection and cancellation, WebView2 installation on a machine without the runtime, and keyboard/screen-reader usability require manual checks. Storybook's accessibility panel helps identify issues; it does not replace an application-wide accessibility review.

## Platform and installation requirements

- The browser app needs localhost or HTTPS for its service worker. Offline reopening requires a complete first load on the same origin.
- WebGL is required for the 3D scene. The device list and forms remain available when it is unavailable.
- Desktop packaging targets Windows x64 and requires WebView2. The unsigned NSIS installer downloads the runtime if needed, which requires an internet connection.
- macOS and Linux installers are not provided.

## Local data and recovery

Homes and profiles are stored on the current device. There is no cloud synchronization, external automatic backup or undo history. Export homes and the library separately to keep portable backups.

A browser profile, browser origin and desktop installation have separate stores. Clearing browser data removes its local workspace. When a save fails or another window changes the workspace, export any local changes you need before reloading.

Removing or replacing a custom visual may leave unused GLB resources in local storage; there is no compaction command. A home export includes its referenced models and scenarios, but not other homes, unused library profiles or interface preferences.

See [saving and recovery](user-guide.md#saving-and-recovery) for the available recovery actions.

## Estimates and V1 boundaries

The supplied profiles are editable examples. Estimates depend on the equipment, usage and prices entered by the user. Heating uses an explicit equivalent operating duration, without a thermal, weather or insulation model.

Simulated power is not a live measurement or a prediction of installation capacity. It does not change annual energy estimates. EUR/USD selection changes display formatting without converting entered amounts.

The V1 does not include an online catalogue, accounts, Linky integration, live meter data, photo recognition, a geometry editor or calendar tariffs such as Tempo. See the [calculation rules](calculations.md) and [exchange-format limits](wattpack.md).

[English](../en/human-testing.md) · [Français](../fr/human-testing.md) · [Home](../../README.md)

# Human testing

Use this 20–30 minute journey to try the application before sharing feedback. The [7 October review](verification.md#review-before-human-testing-7-october-2026) records the automated checks; this guide covers interaction and platform checks that still need people.

## Before starting

Use the application URL or Windows installer supplied by the organizer. The documentation and Storybook are separate tools. Create a new empty home or use a separate browser profile. Export any existing home and library before testing, and keep one application tab open for the main journey. Removing an installed device has no undo action.

Choose French or English and EUR or USD. Currency selection changes the display without converting amounts. The examples below use EUR and invented equipment, rather than manufacturer specifications. The Windows installer is unsigned and its installation interface is in French.

## Main journey

| Step | Action                                                                                                                            | Expected result                                                                                                                                                    |
| ---- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1    | Create an empty home. Enter a Base tariff of 0.25 per kWh and an annual standing charge of 180.                                   | Zero kWh; the standing charge still contributes to the budget.                                                                                                     |
| 2    | Create a profile named **Test lamp**: nominal power 150 W, average power 100 W, 5 hours/day, 365 days/year, zero standby.         | The default usage estimates **182.5 kWh/year**. Nominal power does not replace average power in this calculation.                                                  |
| 3    | Open the JSON tab, remove a required field and try saving. Reset from the form, then change the name through valid JSON.          | Invalid text remains visible and saving is blocked. Valid changes synchronize with the form.                                                                       |
| 4    | Add the profile to the empty home and set its quantity to two. Apply the changes.                                                 | **365 kWh/year**; energy cost **91.25/year**, total budget **271.25/year** before display rounding.                                                                |
| 5    | Click the device name, then its pencil button.                                                                                    | The name selects the object. The pencil also brings the parameters panel into view.                                                                                |
| 6    | Add different devices, arrange the grid, move objects, toggle snapping, orbit and zoom. Switch between Consumption and Placement. | Objects remain accessible, the board grows as needed and positions survive reload. Placement has uniform sizes; Consumption reflects annual shares.                |
| 7    | Create a scenario and remove the two-lamp group using its row action.                                                             | The reference retains its lamps. With unchanged tariffs and other equipment, the scenario saves **365 kWh and 91.25/year**.                                        |
| 8    | Enter an extra upfront cost of 100 in the scenario.                                                                               | Simple payback is about **1.1 years**. A scenario without positive savings has no payback.                                                                         |
| 9    | Return to the reference and set the lamp group to Running in the power simulator.                                                 | The lamps contribute **200 W**, with no change to annual consumption. Running/standby/off states reset after reopening.                                            |
| 10   | Try the bill benchmark, language, dark mode, palette and currency. Reload or restart.                                             | Saved data and preferences return. Switching currency preserves numeric values and kWh.                                                                            |
| 11   | Export the home and library, then import them into another browser profile or application instance.                               | Imports preview their contents and create new copies. A home carries its scenarios and model dependencies; the recipient selects the matching currency separately. |

The example budget in step 4 assumes the home contains only the two lamps. Other unchanged devices contribute to both totals and cancel out when comparing savings.

Optionally import the [custom-model example](../../examples/modele-personnalise.wattpack), add its device, export and reopen the home. Its GLB is a technical triangle fixture, not an appliance model.

## Platform and recovery checks

- **Windows:** use the actual native import/export selectors, including cancellation. Export a home, reopen it and check its scenarios and custom model. These interactive selectors still need manual validation.
- **Mobile/tablet:** check the library immediately above the 3D card, dialogs, scrolling and touch controls. Chromium viewport screenshots do not validate physical Apple devices or Safari.
- **Keyboard:** use Tab, Enter and Space to navigate, edit and remove devices, open dialogs and toggle snapping. Note missing focus or unreachable actions.
- **Two tabs:** open a second tab and edit the same data. A stale tab must report a conflict instead of overwriting changes. Export its local edits before explicitly reloading if you need to keep them.
- **Offline web:** first load the production app fully on its normal origin and allow its cache to finish, then disconnect and reload. The development server does not provide the production offline cache.

## Report a problem

Record the application version, operating system, browser/WebView2, viewport, language, currency and theme. Describe the steps, expected result, actual result and whether reopening changes it. Include a screenshot and, if useful, a minimal `.wattpack` with invented data.

Also report confusing labels, unclear actions and difficulty finding features, even when they technically work. See [saving and recovery](user-guide.md#saving-and-recovery) before clearing data or reloading a conflicted window.

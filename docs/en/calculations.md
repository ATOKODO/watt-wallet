[English](../en/calculations.md) · [Français](../fr/calculations.md) · [Home](../../README.md)

# Calculations and estimates

Walletricity calculates from the values you enter. It does not obtain live meter data, validate manufacturer specifications or model a home's heat loss. Prices below are worked examples, not supplier tariffs.

## Power, energy and cost

| Unit  | Meaning                                       | Example                                                       |
| ----- | --------------------------------------------- | ------------------------------------------------------------- |
| W     | Power: the rate at which electricity is used. | A device averages 100 W while running.                        |
| kW    | 1,000 W.                                      | 1,500 W = 1.5 kW.                                             |
| kWh   | Energy accumulated over time.                 | 1 kW for one hour uses 1 kWh.                                 |
| €/kWh | Price paid for energy.                        | 182.5 kWh at €0.25/kWh costs €45.625 before display rounding. |

Rated power (`nominalW`) is indicative and is not automatically used in the annual calculation or power simulator. Average running power can be lower than the rated maximum, particularly for cycling or thermostatically controlled equipment. Use a measured or justified average where possible and document its source.

The conventional year is **365 days / 8,760 hours**. Cycle calculations use **52 weeks**, rather than 365/7. No intermediate rounding is applied; interface formatting rounds only the displayed result, using the selected language. Choose EUR (euro, the default) or USD (US dollar) independently from the language. This changes the currency unit, without converting entered values or changing any calculation. Enter your tariffs and upfront costs in the selected currency. The examples below use euros.

## Three exclusive calculation methods

Choose one method per profile or installed device. The unused usage fields are retained to make method changes easier, but do not contribute to the selected method's energy calculation.

| Method                 | Active energy for one device                        |
| ---------------------- | --------------------------------------------------- |
| **Power × duration**   | `activeW × hoursPerDay × daysPerYear / 1000`        |
| **Energy per cycle**   | `kwhPerCycle × cyclesPerWeek × 52`                  |
| **Annual consumption** | `kwhPerYear`, including all active use and standby. |

For a heater, enter equivalent hours at the stated running power. For example, a heater averaging its full 1,500 W for the equivalent of five hours per day over 150 days uses **1,125 kWh/year**. The app cannot calculate those hours from a thermostat setting, weather, insulation or floor area.

### Example: power and duration

For 100 W, five hours per day and 365 days:

```text
100 × 5 × 365 / 1000 = 182.5 kWh/year
```

With zero standby, one device uses 182.5 kWh/year. Two identical devices use **365 kWh/year**.

### Example: cycles

For 0.8 kWh per cycle and three cycles per week:

```text
0.8 × 3 × 52 = 124.8 kWh/year
```

Cycle duration is not needed to calculate this active energy. It is needed for nonzero standby and for a running-power estimate derived from cycle energy.

### Example: annual energy

A refrigerator entered as 210 kWh/year uses **210 kWh/year** at quantity one or **420 kWh/year** at quantity two. This value is all-inclusive: standby is not added again, and the duration/cycle fields do not alter it.

## Standby and quantity

For power and cycle methods, standby applies to every remaining hour in the conventional year, including days outside the active season:

```text
Active hours (power) = hoursPerDay × daysPerYear
Active hours (cycle) = cycleHours × cyclesPerWeek × 52
Standby energy = standbyW × (8760 − active hours) / 1000
Group energy = (active energy + standby energy) × quantity
```

If a device is unplugged during those remaining hours, enter zero standby. The model does not distinguish separate unplugged and standby schedules.

For the 100 W example with 1 W standby:

| Component          | Calculation            | kWh/year    |
| ------------------ | ---------------------- | ----------- |
| Active use         | `100 × 5 × 365 / 1000` | 182.5       |
| Standby            | `1 × 6935 / 1000`      | 6.935       |
| Total, one device  | `182.5 + 6.935`        | **189.435** |
| Total, two devices | `189.435 × 2`          | **378.87**  |

For the cycle example with two-hour cycles and 0.5 W standby, active hours are `2 × 3 × 52 = 312`. Standby is `0.5 × (8760 − 312) / 1000 = 4.224 kWh`, giving **129.024 kWh/year** for one device.

Hours/day must be between 0 and 24, days/year between 0 and 365, and off-peak share between 0 and 100. Quantity is an integer from 1 to 10,000. Values must be finite and nonnegative. Annual cycle hours may not exceed 8,760, even with zero standby; cycle duration must be positive when standby is nonzero.

## Tariffs and standing charges

For **Base**, device energy cost is `group kWh × basePrice`.

For **Peak / off-peak hours**, the entered off-peak percentage applies to the device's total energy, including standby:

```text
Off-peak fraction = offPeakPercent / 100
Effective price = peakPrice × (1 − fraction) + offPeakPrice × fraction
Device energy cost = group kWh × effective price
```

For 1,000 kWh, 40% off-peak, €0.27/kWh peak and €0.20/kWh off-peak:

```text
Peak:      600 × 0.27 = €162
Off-peak:  400 × 0.20 = €80
Energy:                €242/year
Standing charge:       €180/year
Total budget:          €422/year
Monthly average:       €422 / 12 = €35.166666…
```

Off-peak share defaults to **0%**: all energy is charged at the peak price until you change that device's share. There is no automatic tariff timetable, cycle scheduling or Tempo calendar.

The standing charge is a fixed annual amount. It enters the home's total budget, but is not allocated to devices or category energy costs. The total monthly average includes it and is always the annual total divided by twelve. A home with no energy use can therefore still have a budget equal to its standing charge.

## Consumption shares and 3D size

A group's share is `group kWh / total home kWh`. Categories add up their device energy. Standing charges play no part in these percentages. When total energy is zero, all shares are zero.

In **Consumption** mode, normalized bounding-box volume is proportional to the share; linear scale follows its cube root. Exact percentages remain available separately. Zero-energy devices are gray markers. **Placement** mode uses uniform normalized sizes. The board is a comparison diagram, not a floor plan with physical dimensions.

## Scenarios, savings and payback

A scenario copies the selected configuration, but compares with the **current reference of the parent home**. Copies are independent; later reference edits change the comparison, not the scenario's stored equipment.

```text
Energy saved = reference kWh − scenario kWh
Annual savings = reference total budget − scenario total budget
Simple payback (years) = upfront extra cost / annual savings
```

The total-budget difference includes changes to both energy prices and standing charges. Category comparisons show energy-cost differences only; a standing-charge difference is not assigned to a category.

### Example: shorter heating use

Three 1,500 W heaters, 150 days/year, zero standby and a Base price of €0.25/kWh:

| Result                                                             | Reference: 5 h/day | Scenario: 4 h/day |
| ------------------------------------------------------------------ | ------------------ | ----------------- |
| Heater group energy                                                | 3,375 kWh/year     | 2,700 kWh/year    |
| Heater energy cost                                                 | €843.75/year       | €675/year         |
| Budget with an unchanged €180 standing charge and no other devices | €1,023.75/year     | €855/year         |

The change saves **675 kWh and €168.75 per year**. A €120 upfront extra cost gives `120 / 168.75 = 0.711111… years`, approximately **0.7 years** when displayed. Other unchanged devices do not affect the savings.

Payback is unavailable when annual savings are zero or negative. Positive savings with zero upfront extra cost give zero years. This is a simple ratio, without financing, discounted cash flow, future tariff changes or maintenance differences.

## Simulated power and bill benchmark

The temporary power simulator answers “which devices are running now?” independently of annual usage:

| State   | Watts used for the group                                                                                                                            |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Off     | Zero.                                                                                                                                               |
| Running | `simulatedRunningW` if supplied; otherwise `activeW`, or `kwhPerCycle × 1000 / cycleHours` when cycle duration is positive; multiplied by quantity. |
| Standby | `simulatedStandbyW` if supplied; otherwise `standbyW` for power/cycle methods; multiplied by quantity.                                              |

Missing watts are flagged and excluded from the total. A supplied zero is a known zero, not missing data. Annual-energy profiles need explicit simulation watts. Cycle-derived power is an average, not a peak, and the app does not assess breaker trips or electrical installation capacity. Switch states start at Off, stay separate per home/scenario during the session and are not saved or exported.

For twelve months of observed consumption, the bill benchmark shows `observedAnnualKwh − reference estimated kWh`. A positive difference means observed use was higher. It is a saved comparison, not automatic calibration or device identification.

See the [user guide](user-guide.md) for entering these values and the [format contract](wattpack.md) for their exact JSON names.

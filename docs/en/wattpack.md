[English](../en/wattpack.md) · [Français](../fr/wattpack.md) · [Home](../../README.md)

# `.wattpack` format — version 1

A `.wattpack` is a standalone ZIP archive for device profiles or a home with its scenarios. Its UTF-8 `manifest.json` sits at the root. Referenced custom visuals are stored as `assets/<assetId>.glb`. No other files are accepted; names are case-sensitive.

The public [JSON schema](../wattpack.schema.json) describes the structure. Runtime validation also checks usage consistency, identifiers, resource references, ZIP integrity and GLB content. Changing the application language does not change the format.

## Package structure

```text
example.wattpack
├── manifest.json
└── assets/
    └── custom-model.glb
```

The `assets/` line describes the path prefix of files, not an additional ZIP directory entry. Omit custom files when only built-in silhouettes are used. Assets referenced multiple times are embedded once. Original GLB bytes are retained without conversion.

| Manifest field | Value                                                                    |
| -------------- | ------------------------------------------------------------------------ |
| `format`       | `"watt-wallet"`                                                          |
| `version`      | `1`                                                                      |
| `kind`         | `"library"` or `"home"`                                                  |
| `definitions`  | Required for `library`: one or more complete `DeviceDefinition` objects. |
| `home`         | Required for `home`: one complete `Home`.                                |

The manifest uses strict objects: unknown fields are rejected. A single-profile package uses the same library shape as a multi-profile package. A home includes embedded profile snapshots, not links to an external catalogue.

## Complete device profile

This is a valid `DeviceDefinition` for the library JSON editor. It is an illustrative 100 W device with five hours/day of default use, not a manufacturer's specification. With zero standby, quantity one uses **182.5 kWh/year**.

```json
{
  "id": "example-device",
  "name": "Example device",
  "brand": "",
  "reference": "",
  "category": "Électroménager",
  "nominalW": 150,
  "simulatedRunningW": 100,
  "simulatedStandbyW": 0,
  "energy": {
    "method": "power",
    "activeW": 100,
    "standbyW": 0
  },
  "defaultUsage": {
    "hoursPerDay": 5,
    "daysPerYear": 365,
    "cyclesPerWeek": 3,
    "cycleHours": 2,
    "offPeakPercent": 0
  },
  "visual": {
    "kind": "builtin",
    "id": "pc"
  },
  "notes": "Editable example; enter your own equipment values."
}
```

The app manages `id` in the profile editor: it assigns the identity at creation and preserves it during editing. The field remains required in the public contract. Brand, reference and notes are required fields but may be empty strings. `nominalW` is indicative, not the automatically selected calculation power.

`simulatedRunningW` and `simulatedStandbyW` are optional. They affect only the temporary power simulator. Omission is accepted in existing files; explicit zero remains a known value. See [the simulator rules](calculations.md#simulated-power-and-bill-benchmark) for fallback behavior.

### Energy and usage contracts

`energy` chooses exactly one of these shapes:

| Method   | Required fields                              |
| -------- | -------------------------------------------- |
| `power`  | `method: "power"`, `activeW`, `standbyW`     |
| `cycle`  | `method: "cycle"`, `kwhPerCycle`, `standbyW` |
| `annual` | `method: "annual"`, `kwhPerYear`             |

Do not include fields belonging to another energy method. The annual value already includes standby.

Both `defaultUsage` and an instance's `usage` require all five fields: `hoursPerDay`, `daysPerYear`, `cyclesPerWeek`, `cycleHours` and `offPeakPercent`. Inactive usage fields are retained but only the selected method contributes to the calculation. Percentages run from 0 to 100, not 0 to 1.

Valid category values remain French in both interface languages: `Chauffage`, `Eau chaude`, `Électroménager`, `Informatique & TV`, `Cuisson`, `Éclairage & autres`. Translate their displayed labels, not the stored enum values.

## Library manifest example

This complete manifest contains one cycle-based device. Zip this as `manifest.json` with no asset files; merely renaming a JSON file to `.wattpack` does not create an archive.

```json
{
  "format": "watt-wallet",
  "version": 1,
  "kind": "library",
  "definitions": [
    {
      "id": "example-washer",
      "name": "Example washing machine",
      "brand": "",
      "reference": "",
      "category": "Électroménager",
      "nominalW": 2000,
      "energy": {
        "method": "cycle",
        "kwhPerCycle": 0.8,
        "standbyW": 0
      },
      "defaultUsage": {
        "hoursPerDay": 0,
        "daysPerYear": 365,
        "cyclesPerWeek": 3,
        "cycleHours": 2,
        "offPeakPercent": 0
      },
      "visual": {
        "kind": "builtin",
        "id": "washer"
      },
      "notes": "Editable example: 124.8 kWh/year with this default usage."
    }
  ]
}
```

## Homes, instances and scenarios

A `DeviceInstance` contains `id`, a complete profile in `definition`, all usage fields in `usage`, an integer `quantity` and `position: { x, z }`. Editing the source library profile does not modify this embedded copy. Usage on the instance drives its estimate; `defaultUsage` stays part of the profile snapshot.

A `Tariff` requires `mode` (`base` or `hp-hc`), `basePrice`, `peakPrice`, `offPeakPrice` and `subscription`. Price fields are euros per kWh; subscription is euros per year. The inactive price fields remain required. All amounts are entered including taxes.

A `Home` contains `id`, `name`, `tariff`, `devices` and `scenarios`, plus optional `observedAnnualKwh`. A `Scenario` contains `id`, `name`, `initialCost`, `tariff` and `devices`. It compares to the current parent reference, without a scenario dependency graph. `initialCost` is the upfront extra cost in euros.

Here is a valid minimal home package with an empty reference and scenario. It illustrates the nesting; the downloadable examples below include installed devices.

```json
{
  "format": "watt-wallet",
  "version": 1,
  "kind": "home",
  "home": {
    "id": "example-home",
    "name": "Example home",
    "tariff": {
      "mode": "base",
      "basePrice": 0.25,
      "peakPrice": 0.27,
      "offPeakPrice": 0.2,
      "subscription": 180
    },
    "devices": [],
    "scenarios": [
      {
        "id": "example-scenario",
        "name": "Example scenario",
        "initialCost": 120,
        "tariff": {
          "mode": "base",
          "basePrice": 0.25,
          "peakPrice": 0.27,
          "offPeakPrice": 0.2,
          "subscription": 180
        },
        "devices": []
      }
    ]
  }
}
```

`observedAnnualKwh`, when present, is the twelve-month bill benchmark for the reference. Its absence is accepted in older files. Results are recalculated at opening and are not stored in the package. Board positions are stored in abstract units; X/Z range from −10,000 to +10,000. Board bounds are derived from object count, displayed sizes and positions, not persisted.

Temporary power-switch states, camera state, snapping, theme, color and language are not exported. A home carries only its installed snapshots and their dependencies, not unused library profiles or other homes.

## Visuals and GLB resources

Built-in visual: `{"kind":"builtin","id":"fridge"}`.

Stable built-in identifiers are `bulb`, `radiator`, `ac`, `boiler`, `fridge`, `freezer`, `tv`, `pc`, `laptop`, `router`, `washer`, `dishwasher`, `oven` and `hob`.

Custom visual: `{"kind":"glb","assetId":"custom-fridge","fallback":"fridge"}`, with the file `assets/custom-fridge.glb`. `assetId` uses 1–100 ASCII letters, digits, underscores or hyphens. The fallback is a built-in identifier. Multiple profiles may refer to the same asset.

Accepted GLB resources have:

- GLB version 2, one JSON chunk and optionally a BIN chunk, with embedded data; no URIs in buffers or images and no external dependencies.
- Embedded PNG/JPEG textures; no Draco, Meshopt, KTX2 or WebP. Unsupported required extensions are refused.
- Nonempty finite geometry; the test load refuses more than one million triangles.
- A conservative pre-load decoded geometry budget of **64 MiB per GLB**, covering binary views, accessors, missing-buffer arrays, strides and sparse copies.
- At most **32 images**, **4,096 pixels per side** and **64 megapixels** in total.

The original bytes are shared unchanged. Normalized origin and bounding-box volume affect only rendering; animations are not played. A `.glb` extension alone does not establish compatibility. Import the model through the form before referring to a local resource from the JSON editor.

## Validation and limits

| Item                                               | Limit                                                                             |
| -------------------------------------------------- | --------------------------------------------------------------------------------- |
| Compressed archive and total decompressed contents | 100 MiB each, including the manifest.                                             |
| Archive entries                                    | 200 maximum.                                                                      |
| Each GLB file                                      | 20 MiB maximum.                                                                   |
| Library profiles                                   | 2,000 per package and local library.                                              |
| Instances                                          | 500 per reference or scenario; quantity is 1–10,000 per instance.                 |
| Scenarios                                          | 50 per home.                                                                      |
| Local homes                                        | 100.                                                                              |
| Profile/home/scenario name                         | 1–100 characters; profile names are trimmed.                                      |
| IDs                                                | 1–120 characters; asset IDs use the stricter rule above.                          |
| Brand/reference and notes                          | 100 characters each for brand/reference; 2,000 for notes.                         |
| General nonnegative numeric fields                 | Finite, at most 1,000,000,000; usage and positions have their own tighter bounds. |

Hours/day must be 0–24, days/year 0–365, off-peak percentage 0–100 and cycle duration 0–8,760 hours. Annual cycle hours may not exceed 8,760; nonzero cycle standby requires positive cycle duration. Duplicate profile IDs in a library, scenario IDs in a home and instance IDs within a configuration are rejected.

ZIP uses Store or Deflate, with no encryption, multipart archives or ZIP64. Absolute paths, parent traversal, duplicate entries, nested archives and unrecognized paths are rejected. Headers, declared/decompressed sizes, CRC32 and references are checked. The archive is processed in memory without extracting user-supplied paths onto disk. Unknown versions, missing models and invalid scenarios reject the package before local workspace modification; no partial import or external-resource download is performed.

## Import behavior and examples

Validation prepares an import preview. Confirmation adds new copies, remaps profile/home/scenario/instance IDs and shared asset references, then saves locally. Existing items are not overwritten. Importing again creates another copy. A retry within the same failed import reuses its prepared identities and original resources.

The repository includes:

- [Generic library](../../examples/bibliotheque.wattpack) and [readable manifest](../../examples/bibliotheque.manifest.json): 14 editable profiles.
- [Home and scenario](../../examples/logement.wattpack) and [readable manifest](../../examples/logement.manifest.json): heating-use comparison.
- [Custom model package](../../examples/modele-personnalise.wattpack): a minimal standalone triangular GLB.

Their stored names and notes remain the original example data when opened in English. `npm run examples` regenerates the schema and these packages. See [the developer guide](development.md) for commands and [the user guide](user-guide.md#share-and-back-up) for import/export workflows.

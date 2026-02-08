# Data

Each subfolder is a **case** — a self-contained power grid. Cases are auto-discovered by `runme.py` and loaded at runtime via `?case=texas`.

```
data/
  runme.py               # prebuild: JSON source → _out/
  <case>/
    case.json            # { name, referenceBus, mapConfig: { bounds } }
    substations.json     # array of substations (see below)
    branches.json        # array of branches (see below)
    borders.json         # [[lng, lat], ...] region boundary
    scenarios.ts         # IScenario objects (see lib/types.ts)
  _out/                  # generated (gitignored)
    registry.ts          # async case loader
    <case>/lookups.ts    # SUB/LINE ID constants
    <case>/grid-data.json
```

## Adding a new case

1. Create `data/<case>/` with `case.json`, `substations.json`, `branches.json`, `borders.json`
2. Create `scenarios.ts` (a template is auto-generated on first run if missing)
3. Run `python data/runme.py` then `npm run build`

## JSON formats

### substations.json

Each substation has `Name`, `Latitude`, `Longitude`, and a `Gens` and/or `Loads` block:

```json
{
  "Name": "Armstrong",
  "Latitude": 27.0,
  "Longitude": -97.6,
  "Gens": {
    "Category": "Wind",
    "Pmax": 108.8, "Pmin": 0, "Ramp": 25, "StartTime": 20,
    "FixedCost": 600, "FuelCost": 0,
    "U": [{ "Status": "IN", "P": 71.0 }, { "Status": "DIS", "P": 0 }]
  }
}
```

- **Gens block**: `Category` is one of: Wind, Solar PV, Gas Turbine, Gas Combined Cycle, Coal-fired Steam, Nuclear Steam
- **Loads block**: same shape but no `Category` (always "Load"). Optional `LoadCategory` (Residential/Commercial/Industrial/Datacenter) as block default or per-unit override.
- Block params (Pmax, Pmin, Ramp, StartTime, FixedCost, FuelCost) are defaults — individual units in `U` can override them.
- Each unit: `{ Status: "IN"|"DIS", P: <MW> }`

### branches.json

```json
{ "Number": 1, "FromBus": "Abilene", "ToBus": "McCamey", "Z": 0.2, "Pmax": 500 }
```

`FromBus`/`ToBus` reference substation names. Numeric IDs and derived fields are computed by `runme.py`.

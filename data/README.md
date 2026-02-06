# Data

Each subfolder is a **case** — a self-contained power grid with its own topology, map, and scenarios. The active case is set in `data/cases.ts`. Currently only **texas** exists.

## Folder structure

```
data/
  cases.ts               # Active case export (assembles grid + scenarios)
  scenario-helpers.ts    # Scenario DSL (defineScenario, time, mutation helpers)
  compile.py             # CSV → TypeScript compiler (generates grid.ts + lookups.ts)
  <case>/
    scenarios.ts         # Scenario definitions (uses defineScenario() builder)
    grid.ts              # Compiled grid topology (generated — do not edit)
    lookups.ts           # SUB/LINE ID constants (generated — do not edit)
    source/
      substations.csv    # Substation/generator definitions
      branches.csv       # Transmission line definitions
      borders.json       # Region boundary coordinates [[lng, lat], ...]
```

Type interfaces (`GridCase`, `RawGridData`, `MapConfig`) live in `lib/types.ts`.
Scenario helpers (`defineScenario()`, `time()`, mutation helpers) live in `data/scenario-helpers.ts`.

## Switching cases

In `data/cases.ts`, change which case is assigned to `activeCase`:

```ts
export const activeCase: GridCase = texasCase;
```

The rest of the codebase reads from `activeCase` — no other changes needed.

## Adding a new case

### 1. Create the source data

Create `data/<case>/source/` with three files:

- **`substations.csv`** — one row per substation (see schema below)
- **`branches.csv`** — one row per transmission line (see schema below)
- **`borders.json`** — array of `[longitude, latitude]` pairs tracing the region boundary

### 2. Compile the grid

Add your case name to the `CASES` list at the top of `compile.py`:

```python
CASES = ["texas", "<case>"]
```

Then run:

```bash
python data/compile.py
```

This reads from `source/` and generates both `grid.ts` and `lookups.ts` in the case folder.

### 3. Write scenarios

Create `data/<case>/scenarios.ts` using the `defineScenario()` builder from `data/scenario-helpers.ts`:

```ts
import { defineScenario, time, initWeather, updateLoadCurve } from "@/data/scenario-helpers";
import { SUB, LINE } from "./lookups";

const day1 = defineScenario({
    day: 1,
    briefing: { title: "Day 1", isList: true, points: ["..."] },
    costs: { record: 1.5, good: 2.0, okay: 10.0 },
    start(state, onAlert, onHint) {
        initWeather(state);
    },
    update(state, onAlert) {
        updateLoadCurve(state);
    },
});

export const scenarios: Record<number, IScenario> = { 1: day1 };
```

Scenarios reference substations and branches via the auto-generated `SUB` and `LINE` constants (e.g. `SUB.Houston`, `LINE.Katy_Houston`).

### 4. Register the case

In `data/cases.ts`, import the grid and scenarios, assemble the case, and set it as active:

```ts
import { scenarios } from "./<case>/scenarios";
import { gridData } from "./<case>/grid";

const myCase: GridCase = {
    name: "My Case",
    scenarios,
    gridData: gridData as unknown as RawGridData,
    mapConfig: {
        bounds: { xMax: ..., xMin: ..., yMax: ..., yMin: ... },
        initialView: { x0: ..., y0: ..., scale: 50 },
    },
};

export const activeCase: GridCase = myCase;
```

`mapConfig.bounds` defines the map boundary in longitude/latitude. `initialView` sets the starting pan and zoom.

### 5. Build and verify

```bash
npm run build
```

---

## CSV schemas

### substations.csv

| Column     | Description                                                        |
| ---------- | ------------------------------------------------------------------ |
| Number     | Unique ID (string, referenced by scenarios and branches)           |
| Name       | City or plant name                                                 |
| Category   | Load, Wind, Solar PV, Gas Turbine, Gas Combined Cycle, Coal-fired Steam, Nuclear Steam |
| LoadCategory | (Load substations only) Residential, Commercial, Industrial, or Datacenter. Empty for non-load substations. |
| Units      | Number of generating units at this substation                      |
| Latitude   | Decimal degrees                                                    |
| Longitude  | Decimal degrees                                                    |
| Pmax       | Maximum power capacity (MW)                                        |
| Pmin       | Minimum power output when online (MW)                              |
| Ramp       | Ramp rate (MW per time step)                                       |
| StartTime  | Startup time (minutes)                                             |
| FixedCost  | Fixed operating cost ($)                                           |
| FuelCost   | Fuel cost ($/MWh)                                                  |
| UState0–7  | Initial status per unit: IN, DIS, or X (doesn't exist)            |
| UPset0–7   | Initial setpoint per unit (MW)                                     |
| UP0–7      | Initial power output per unit (MW)                                 |

### branches.csv

| Column   | Description                            |
| -------- | -------------------------------------- |
| Number   | Unique ID                              |
| FromSub  | Origin substation name                 |
| ToSub    | Destination substation name            |
| FromNum  | Origin substation Number               |
| ToNum    | Destination substation Number          |
| Circuits | Number of parallel circuits (1 or 2)   |
| Z        | Series impedance (per-unit)            |
| Pmax     | Thermal capacity per circuit (MW)      |
| P        | Initial power flow (MW, typically 0)   |
| Status1  | Circuit 1 status (IN or OUT)           |
| Status2  | Circuit 2 status (IN or OUT)           |

## Known Issues / Planned Changes

- **Square load substation icons:** Load substations on the canvas map should be drawn as squares instead of circles to visually distinguish them from generators. This change is high priority and affects `drawLoadSubstation()` in `lib/view/drawer.ts`.

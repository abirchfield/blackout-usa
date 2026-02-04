# Data

Each subfolder is a **case** — a self-contained power grid with its own topology, map, and scenarios. The active case is set in `data/cases.ts`. Currently only **texas** exists.

## Folder structure

```
data/
  cases.ts               # CaseDefinition types + active case export
  compile.py             # CSV → TypeScript compiler
  <case>/
    case.ts              # Bundles grid data, scenarios, and map config
    scenarios.ts         # Scenario classes (implements IScenario)
    grid.ts              # Compiled grid topology (generated — do not edit)
    source/
      substations.csv    # Substation/generator definitions
      branches.csv       # Transmission line definitions
      borders.json       # Region boundary coordinates [[lng, lat], ...]
```

## Switching cases

In `data/cases.ts`, change which case is active:

```ts
import { texasCase } from "./texas/case";
export const activeCase: CaseDefinition = texasCase;
```

The rest of the codebase reads from `activeCase` — no other changes needed.

## Adding a new case

### 1. Create the source data

Create `data/<case>/source/` with three files:

- **`substations.csv`** — one row per substation (see schema below)
- **`branches.csv`** — one row per transmission line (see schema below)
- **`borders.json`** — array of `[longitude, latitude]` pairs tracing the region boundary

### 2. Compile the grid

```bash
python data/compile.py
```

Add your case name to the `CASES` list at the top of `compile.py` first:

```python
CASES = ["texas", "<case>"]
```

This reads from `source/` and generates `grid.ts` in the case folder.

### 3. Write scenarios

Create `data/<case>/scenarios.ts`. Each scenario is a class implementing `IScenario`:

```ts
import { IScenario, SimulationState, AlertHandler, HintHandler, Briefing, ResultDetails } from "@/lib/types";

class Day1Scenario implements IScenario {
    readonly day = 1;
    readonly briefing: Briefing = { title: "...", isList: true, points: ["..."] };

    start(state: SimulationState, onAlert?: AlertHandler, onHint?: HintHandler): void {
        state.fr_load = 0.83;  // initial load fraction
        state.fr_wind = 0.48;  // initial wind availability
        state.fr_solar = 1.00; // initial solar availability
    }

    update(state: SimulationState, onAlert?: AlertHandler, onHint?: HintHandler): void {
        // Called every tick (1 tick = 1 minute). Adjust load/wind/solar curves,
        // trigger events (trips, outages, weather), fire alerts and hints.
    }

    getResultDetails(totalCost: number): ResultDetails {
        // Return performance tier based on total operating cost.
    }
}

export const scenarios: Record<number, IScenario> = {
    1: new Day1Scenario(),
};
```

Scenarios reference substations and branches by their ID strings (e.g. `state.subs["31"]`, `state.branches["26"]`), so the IDs must match your `substations.csv` and `branches.csv`.

### 4. Create the case definition

Create `data/<case>/case.ts` to bundle everything:

```ts
import { scenarios } from "./scenarios";
import { scenario_data } from "./grid";

export const myCase = {
    name: "My Case",
    scenarios,
    gridData: scenario_data,
    mapConfig: {
        bounds: { xMax: ..., xMin: ..., yMax: ..., yMin: ... },
        initialView: { x0: ..., y0: ..., scale: 50 },
    },
};
```

`mapConfig.bounds` defines the map boundary in longitude/latitude. `initialView` sets the starting pan and zoom.

### 5. Activate the case

In `data/cases.ts`, import your case and set it as active:

```ts
import { myCase } from "./<case>/case";
export const activeCase: CaseDefinition = myCase;
```

### 6. Build and verify

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

- **Square load substation icons:** Load substations on the canvas map should be drawn as squares instead of circles to visually distinguish them from generators. This change is high priority and affects `drawLoadSubstation()` in `lib/svg/drawer.ts`.

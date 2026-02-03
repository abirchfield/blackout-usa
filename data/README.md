# Data

Each subfolder represents a case (grid region). Currently only **texas** exists.

## Folder structure

```
data/
  compile.py           # CSV → TypeScript compiler (shared)
  <case>/
    substations.csv    # Substation/generator definitions
    branches.csv       # Transmission line definitions
    borders.json       # Region boundary coordinates [[lng, lat], ...]
    grid.ts            # Compiled output (generated — do not edit by hand)
```

## Raw data formats

### substations.csv

Each row is a substation (load center or generation plant).

| Column     | Description                                                        |
| ---------- | ------------------------------------------------------------------ |
| Number     | Unique ID                                                          |
| Name       | City/plant name                                                    |
| Latitude   | Decimal degrees                                                    |
| Longitude  | Decimal degrees                                                    |
| Pmax       | Maximum power capacity (MW)                                        |
| Pmin       | Minimum power output when online (MW)                              |
| Ramp       | Ramp rate (MW per time step)                                       |
| StartTime  | Startup time (minutes)                                             |
| Units      | Number of generating units                                         |
| FixedCost  | Fixed operating cost ($)                                           |
| FuelCost   | Fuel cost ($/MWh)                                                  |
| Category   | Load, Wind, Solar PV, Gas Turbine, Gas Combined Cycle, Coal-fired Steam, Nuclear Steam |
| UState0‑7  | Initial status per unit (IN, DIS, or X if unit doesn't exist)      |
| UPset0‑7   | Initial setpoint per unit (MW)                                     |
| UP0‑7      | Initial power output per unit (MW)                                 |

### branches.csv

Each row is a transmission line connecting two substations.

| Column   | Description                            |
| -------- | -------------------------------------- |
| Number   | Unique ID                              |
| FromSub  | Origin substation name                 |
| ToSub    | Destination substation name            |
| Circuits | Number of parallel circuits            |
| FromNum  | Origin substation number               |
| ToNum    | Destination substation number          |
| Z        | Impedance (per-unit)                   |
| Pmax     | Thermal capacity (MW)                  |
| P        | Initial power flow (MW, typically 0)   |
| Status1  | Circuit 1 status (IN/OUT)              |
| Status2  | Circuit 2 status (IN/OUT)              |

### borders.json

A JSON array of `[longitude, latitude]` coordinate pairs tracing the region boundary, used for canvas map rendering.

## Compiling

After editing any CSV or borders file, regenerate `grid.ts`:

```bash
python data/compile.py texas
```

This reads the three raw files from `data/texas/` and writes `data/texas/grid.ts`, which is then imported by the game engine at build time.

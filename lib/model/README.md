# lib/model/ — Grid Simulation Model

Pure simulation logic for the power grid game. No UI dependencies — React hooks in `lib/hooks/` bridge these modules to the component tree. All functions accept `SimState` (not `GameState`).

## Entry Point: GridModel

`grid-model.ts` implements the `IGridModel` interface (defined in `lib/interfaces.ts`) and is the **sole entry point** from the engine into the model layer. The engine never imports from the other model modules directly — all access goes through `GridModel`.

Operator actions (toggle unit/branch, set setpoint, emergency operations) and balance-phase logic (apply loads, compute balance, adjust frequency) are methods directly on `GridModel` — they use `this.state` rather than accepting state as a parameter.

## Files

| File | Purpose |
|------|---------|
| `grid-model.ts` | **`IGridModel` implementation.** Orchestrates the 4-phase pipeline, owns balance logic (apply loads, frequency droop), operator methods (toggle, setpoint, emergencies), day lifecycle. Only file imported by the engine. |
| `power-flow.ts` | Complete solver module. Computes unit output (`rampLimitedSetpoint`, `computeUnitOutput`), bisects for generation-load balance (`findAlpha`), builds Ybus, solves DC power flow, and computes branch flows. |
| `grid-analysis.ts` | Island detection (`detectIslands()` via Union-Find from the reference bus) and probabilistic contingency tripping (frequency-based unit trips, overload-based branch trips). |
| `grid-data.ts` | State initialization, reset, unit state transitions (STARTUP→IN, SHUTDOWN→DIS), and per-tick metrics (load served, generation by type, reserves, costs). |
| `constants.ts` | All simulation constants (physics, stability, contingency thresholds, economics, timing). Single source of truth — no model file imports from `lib/config.ts`. |

## Per-Tick Execution Order

Called by `GridModel.tick()` (which is invoked by `GameEngine.step()`):

```
Phase 1 — Events
  1. scenario.update()        — scenario-specific mutations (weather, trips, hints)

Phase 2 — Integrity
  2. checkContingencies()     — probabilistic equipment tripping
  3. detectIslands()          — Union-Find island detection, trip disconnected equipment
  4. advanceUnits()           — status counters + transitions (STARTUP→IN, SHUTDOWN→DIS)

Phase 3 — Balance
  5. applyLoads()             — set load u.P, zero inactive units
  6. getBalance()             — sum load, generation min/max/setpoint
  7. adjustFrequency()        — droop model frequency adjustment
     [blackout check]         — end day if frequency < 40 Hz

Phase 4 — Solve
  8. findAlpha()              — binary search for alpha balancing gen to load
  9. solveFlow()              — DC power flow: injection vector → Ybus → theta → branch flows
 10. updateMetrics()          — dashboard metrics (load, gen, reserves, costs)
```

## Key Design Decisions

**Self-Contained Constants**: All simulation constants are defined in `constants.ts` within the model. The model has zero imports from `lib/config.ts` — config is reserved for UI display thresholds and engine playback timing.

**Ybus Caching**: The admittance matrix (`state.Ybus`) and its LU decomposition (`state.Yinv`) are cached and only rebuilt when branch topology changes (circuit toggled, branch tripped). Unit status changes do not invalidate Ybus. Branch admittance (`br.ybr = -1/Z`) is precomputed once in `initGrid()`.

**Union-Find Island Detection**: `detectIslands()` uses a Union-Find (Disjoint Set Union) structure with path-halving and union-by-rank. Reusable `Int32Array` buffers avoid GC pressure. The reference bus index (`state.refIdx`) is pre-computed in `initGrid()`.

**DC Power Flow**: Linearized approximation (angles only, no voltage magnitudes). The reference/slack bus is defined per case in `GridCase.referenceBus` and anchored with a large admittance value. Islanded buses are also anchored to prevent singularity.

**Solver Module**: `power-flow.ts` owns the complete solve pipeline — unit output computation, alpha bisection, and DC power flow. `findAlpha()` runs a 10-iteration binary search over alpha ∈ [-1, 1], scaling generator setpoints via `computeUnitOutput()` to find the balance point.

**Pre-computed Indices**: Substations and branches store pre-computed 0-based numeric indices (`sub.idx`, `br.fromIdx`, `br.toIdx`, `state.refIdx`) to avoid repeated `parseInt()` calls in the per-tick pipeline.

## Case Data Flow

The model layer is case-agnostic. Case-specific data (grid topology, reference bus) comes from `GridCase` in `data/cases.ts`. The reference bus identifier (`GridCase.referenceBus`) is propagated to `SimState.referenceBus` and `SimState.refIdx` during `initGrid()` and used by both the power flow solver and topology analysis.

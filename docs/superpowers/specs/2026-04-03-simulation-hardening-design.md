# Simulation Hardening

Targeted fixes to eliminate silent failures, NaN propagation, and unrecoverable game freezes.

## Fixes

### 1. Cholesky near-singularity detection (utils.ts)

`choleskyFactorize` line 64: change `sum <= 0` to `sum < CHOLESKY_MIN_DIAG` (1e-10). Near-singular matrices now trigger the existing Cholesky-failure fallback (zero all flows) instead of producing near-zero diagonals that cascade to NaN.

### 2. Post-solve NaN scan (network.ts)

After `choleskySolve()`, scan `theta` array with `Number.isFinite()`. If any non-finite value found, zero all branch flows and return. Belt-and-suspenders for anything #1 misses. Add `isFiniteArray(arr, len)` helper to `utils.ts`.

### 3. Zero-capacity branch guard (network.ts)

`overloadTripProbability()`: return 0 if `capacity <= 0`. Prevents division producing Infinity and 100% trip rate every tick.

### 4. Island detection with invalid refIdx (network.ts)

`findIslands()`: when `refIdx < 0`, trip all units on all buses instead of silently returning. No reference bus means nothing is connected.

### 5. Gradual frequency decay below 5 MW (grid.ts)

Replace the binary cliff (`frequency = 0`) with proportional decay: `frequency -= FREQ_STEP_LARGE * (1 + severity * 4)` where severity scales from 0 (at threshold) to 1 (at zero generation). Player sees frequency plummeting and has a few ticks to react.

### 6. Finite frequency guard (grid.ts)

End of `calc_frequency`: if `!Number.isFinite(frequency)`, set to 0. Last defense before the blackout check.

### 7. NaN-safe blackout check (engine.ts)

Change `frequency < threshold` to `!(frequency >= threshold)`. The double-negative catches NaN (since `NaN >= 58` is false).

### 8. rAF loop error boundary (engine.ts)

Wrap `tick()` in try-catch inside `startLoop()`'s loop callback. On error: log, pause game, push critical alert. `draw()` and `requestAnimationFrame(loop)` always run so the UI stays responsive and the loop never dies.

### 9. Operator action wrapper (engine.ts)

Private `act(fn)` method: try { fn(); commit(); } catch { log, alert }. All operator actions (`toggleUnit`, `toggleBranch`, `setSetpoint`, etc.) use it. Preserves existing one-liner style.

### 10. Case loading error boundary (registry.ts)

Wrap `Promise.all` in try-catch with descriptive error message. Validate that `scenario.scenarios` exists and is an object.

### 11. Document snapBranches shared references (engine.svelte.ts)

Add comment to `snapBranches()` explaining that `sub1`/`sub2` are intentionally shared references — components only read `.Name` (immutable). Not worth deep-copying.

## Files changed

- `src/lib/grid/utils.ts` — #1, #2
- `src/lib/grid/network.ts` — #2, #3, #4
- `src/lib/grid/grid.ts` — #5, #6
- `src/lib/grid/constants.ts` — #1 (new constant)
- `src/lib/engine.ts` — #7, #8, #9
- `src/lib/cases/registry.ts` — #10
- `src/lib/stores/engine.svelte.ts` — #11

## Error UX

On simulation error: pause game, show critical alert via existing notification system. Player can try unpausing or return to menu. Least disruptive to gameplay.

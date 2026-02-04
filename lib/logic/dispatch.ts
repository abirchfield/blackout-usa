import { SimulationState, SubstationCategory, UnitStatus, Substation, Unit } from "../types";
import { getAvailableCapacity, isUnitInactive, isVariableRenewable } from "../utils";
import { PhysicsConfig } from "../config";

const POWER_BALANCE_ALPHA_MIN = -1;
const POWER_BALANCE_ALPHA_MAX = 1;
const POWER_BALANCE_MAX_ITERATIONS = 10;

const BASE_FREQUENCY = PhysicsConfig.BASE_FREQUENCY;
const FREQUENCY_ADJUSTMENT_DROOP = PhysicsConfig.FREQUENCY_DROOP;
const FREQUENCY_ADJUSTMENT_THRESHOLD = PhysicsConfig.FREQUENCY_ADJUSTMENT_THRESHOLD_MW;
const MIN_GENERATION_BASE_FOR_FREQ_STABILITY = PhysicsConfig.MIN_GENERATION_FOR_FREQ_STABILITY_MW;

export function calculateUnitTempset(u: Unit, sub: Substation): number {
  const pmax = sub.Pmax / sub.Units;
  const pmin = sub.Pmin / sub.Units;

  let psetForCalc = u.Pset;
  if (u.Status === UnitStatus.STARTUP && pmin > 0) {
    psetForCalc = pmin;
  }
  psetForCalc = Math.max(pmin, Math.min(pmax, psetForCalc));

  return Math.min(u.P + sub.Ramp, Math.max(u.P - sub.Ramp, psetForCalc));
}

/** Calculate the target power output for a single generator unit given alpha scaling. No state mutations. */
export function calculateUnitDispatch(u: Unit, sub: Substation, alpha: number, frWind: number, frSolar: number): number {
  const pmax = sub.Pmax / sub.Units;
  const pmin = sub.Pmin / sub.Units;
  const tempset = calculateUnitTempset(u, sub);

  if (u.Status === UnitStatus.SHUTDOWN) {
    return Math.max(u.P - sub.Ramp, 0);
  } else if (isVariableRenewable(sub.Category)) {
    const pavail = getAvailableCapacity(pmax, sub.Category, frWind, frSolar);
    const effectiveSet = Math.min(tempset, pavail);
    return Math.max(0, Math.min(pavail, u.P + sub.Ramp, effectiveSet + alpha * pmax));
  } else {
    if (u.Status === UnitStatus.IN || (u.Status === UnitStatus.STARTUP && u.StatusCount >= sub.StartTime)) {
      return Math.max(pmin, Math.min(pmax, u.P + sub.Ramp, tempset + alpha * pmax));
    }
  }
  return 0;
}

export function calculatePowerBalance(state: SimulationState) {
  let PL = 0, PGSET = 0, PGMIN = 0, PGMAX = 0;
  for (const key in state.subs) {
    const sub = state.subs[key];
    for (let iu = 0; iu < sub.Units; ++iu) {
      const u = sub.U[iu];
      const pmax = sub.Pmax / sub.Units;
      const pmin = sub.Pmin / sub.Units;
      u.StatusCount += 1;

      let tempset = calculateUnitTempset(u, sub);
      if (isUnitInactive(u.Status)) continue;
      if (sub.Category === SubstationCategory.Load) {
        PL += pmax * state.fr_load;
      } else if (u.Status === UnitStatus.SHUTDOWN) {
        PGMIN += Math.max(0, u.P - sub.Ramp);
        PGMAX += Math.max(0, u.P - sub.Ramp);
        PGSET += Math.max(0, u.P - sub.Ramp);
      } else if (isVariableRenewable(sub.Category)) {
        const pavail = getAvailableCapacity(pmax, sub.Category, state.fr_wind, state.fr_solar);
        if (tempset > pavail) tempset = pavail;
        PGMIN += Math.max(u.P - sub.Ramp, 0);
        PGMAX += Math.min(u.P + sub.Ramp, pavail);
        PGSET += tempset;
      } else {
        if (u.Status === UnitStatus.STARTUP) {
          if (u.StatusCount >= sub.StartTime) {
            PGMIN += Math.min(u.P + sub.Ramp, Math.max(pmin, u.P - sub.Ramp));
            PGMAX += Math.min(pmax, u.P + sub.Ramp);
            PGSET += tempset;
          }
        } else {
          PGMIN += Math.max(pmin, u.P - sub.Ramp);
          PGMAX += Math.min(pmax, u.P + sub.Ramp);
          PGSET += tempset;
        }
      }
    }
  }
  return { PL, PGSET, PGMIN, PGMAX };
}

export function dispatchGeneration(state: SimulationState, PL: number): number {
  // Set load P values
  for (const key in state.subs) {
    const sub = state.subs[key];
    for (let iu = 0; iu < sub.Units; ++iu) {
      const u = sub.U[iu];
      if (sub.Category === SubstationCategory.Load && u.Status === UnitStatus.IN) {
        u.P = (sub.Pmax / sub.Units) * state.fr_load;
      } else if (isUnitInactive(u.Status)) {
        u.P = 0;
      }
    }
  }

  let alpha0 = POWER_BALANCE_ALPHA_MIN, alpha1 = POWER_BALANCE_ALPHA_MAX, alpha = 0;
  for (let iter = 0; iter < POWER_BALANCE_MAX_ITERATIONS; iter++) {
    let PBAL = PL;
    alpha = 0.5 * (alpha0 + alpha1);
    for (const key in state.subs) {
      const sub = state.subs[key];
      if (sub.Category === SubstationCategory.Load) continue;
      for (let iu = 0; iu < sub.Units; ++iu) {
        const u = sub.U[iu];
        if (isUnitInactive(u.Status)) continue;
        PBAL -= calculateUnitDispatch(u, sub, alpha, state.fr_wind, state.fr_solar);
      }
    }
    if (PBAL > 0) alpha0 = alpha;
    else alpha1 = alpha;
  }
  return alpha;
}

export function updateFrequency(state: SimulationState, PL: number, PGMIN: number, PGMAX: number, PGSET: number) {
  if (PGMAX < MIN_GENERATION_BASE_FOR_FREQ_STABILITY) {
    state.frequency = 0.0;
  } else if (PL <= PGMIN) {
    state.frequency += (PL - PGMIN < -FREQUENCY_ADJUSTMENT_THRESHOLD) ? 0.05 : 0.01;
  } else if (PL >= PGMAX) {
    state.frequency -= (PL - PGMAX > FREQUENCY_ADJUSTMENT_THRESHOLD) ? 0.05 : 0.01;
  } else {
    if (PGMAX > PGMIN) {
      const PMAKE = PL - PGSET;
      const ftarg = BASE_FREQUENCY - FREQUENCY_ADJUSTMENT_DROOP * PMAKE / (PGMAX - PGMIN);
      if (state.frequency < ftarg) state.frequency += 0.01;
      else state.frequency -= 0.01;
    }
  }
}

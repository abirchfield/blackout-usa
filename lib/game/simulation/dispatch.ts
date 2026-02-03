import { SimulationState, SubstationCategory, UnitStatus, Substation, Unit } from "../types";
import { PhysicsConfig } from "../config";

const POWER_BALANCE_ALPHA_MIN = -1;
const POWER_BALANCE_ALPHA_MAX = 1;
const POWER_BALANCE_MAX_ITERATIONS = 10;

const BASE_FREQUENCY = PhysicsConfig.BASE_FREQUENCY;
const FREQUENCY_ADJUSTMENT_DROOP = 0.2;
const FREQUENCY_ADJUSTMENT_THRESHOLD = 500;
const MIN_GENERATION_BASE_FOR_FREQ_STABILITY = 5;

export class DispatchSolver {
  public calculatePowerBalance(state: SimulationState) {
    let PL = 0, PGSET = 0, PGMIN = 0, PGMAX = 0;
    for (const key in state.subs) {
        const sub = state.subs[key];
        for (let iu = 0; iu < sub.Units; ++iu) {
            const u = sub.U[iu];
            const pmax = sub.Pmax / sub.Units;
            const pmin = sub.Pmin / sub.Units;
            u.StatusCount += 1;

            let tempset = this.calculateUnitTempset(u, sub);
            if (u.Status === UnitStatus.DIS || u.Status === UnitStatus.TRIP) continue;
            if (sub.Category === SubstationCategory.Load) {
                PL += pmax * state.fr_load;
            } else if (u.Status === UnitStatus.SHUTDOWN) {
                PGMIN += Math.max(0, u.P - sub.Ramp);
                PGMAX += Math.max(0, u.P - sub.Ramp);
                PGSET += Math.max(0, u.P - sub.Ramp);
            } else if (sub.Category === SubstationCategory.Wind) {
                const pavail = pmax * state.fr_wind;
                if (tempset > pavail) tempset = pavail;
                PGMIN += Math.max(u.P - sub.Ramp, 0);
                PGMAX += Math.min(u.P + sub.Ramp, pavail);
                PGSET += tempset;
            } else if (sub.Category === SubstationCategory.Solar) {
                const pavail = pmax * state.fr_solar;
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

  public dispatchGeneration(state: SimulationState, PL: number): number {
    // Set load P values
    for (const key in state.subs) {
        const sub = state.subs[key];
        for (let iu = 0; iu < sub.Units; ++iu) {
            const u = sub.U[iu];
            if (sub.Category === SubstationCategory.Load && u.Status === UnitStatus.IN) {
                u.P = (sub.Pmax / sub.Units) * state.fr_load;
            } else if (u.Status === UnitStatus.DIS || u.Status === UnitStatus.TRIP) {
                u.P = 0;
            }
        }
    }

    let alpha0 = POWER_BALANCE_ALPHA_MIN, alpha1 = POWER_BALANCE_ALPHA_MAX, alpha = 0;
    for(let iter = 0; iter < POWER_BALANCE_MAX_ITERATIONS; iter++) {
        let PBAL = PL;
        alpha = 0.5 * (alpha0 + alpha1);
        for (const key in state.subs) {
            const sub = state.subs[key];
            if (sub.Category === SubstationCategory.Load) continue;
            for (let iu = 0; iu < sub.Units; ++iu) {
                const u = sub.U[iu];
                if (u.Status === UnitStatus.DIS || u.Status === UnitStatus.TRIP) continue;
                
                const pmax = sub.Pmax / sub.Units;
                const pmin = sub.Pmin / sub.Units;

                let tempset = this.calculateUnitTempset(u, sub);
                let tryp = 0;

                if (u.Status === UnitStatus.SHUTDOWN) {
                    tryp = Math.max(u.P - sub.Ramp, 0);
                } else if (sub.Category === SubstationCategory.Wind) {
                    const pavail = pmax * state.fr_wind;
                    if (tempset > pavail) tempset = pavail;
                    tryp = Math.max(0, Math.min(pavail, u.P + sub.Ramp, tempset + alpha * pmax));
                } else if (sub.Category === SubstationCategory.Solar) {
                    const pavail = pmax * state.fr_solar;
                    if (tempset > pavail) tempset = pavail;
                    tryp = Math.max(0, Math.min(pavail, u.P + sub.Ramp, tempset + alpha * pmax));
                } else { // Thermal, Nuclear
                    if (u.Status === UnitStatus.STARTUP && u.StatusCount >= sub.StartTime) {
                        tryp = Math.max(pmin, Math.min(pmax, u.P + sub.Ramp, tempset + alpha * pmax));
                    } else if (u.Status === UnitStatus.IN) {
                        tryp = Math.max(pmin, Math.min(pmax, u.P + sub.Ramp, tempset + alpha * pmax));
                    }
                }
                PBAL -= tryp;
            }
        }
        if (PBAL > 0) alpha0 = alpha;
        else alpha1 = alpha;
    }
    return alpha;
  }

  private calculateUnitTempset(u: Unit, sub: Substation): number {
    const pmax = sub.Pmax / sub.Units;
    const pmin = sub.Pmin / sub.Units;

    let psetForCalc = u.Pset;
    if (u.Status === UnitStatus.STARTUP && pmin > 0) {
        psetForCalc = pmin;
    }
    psetForCalc = Math.max(pmin, Math.min(pmax, psetForCalc));
    
    const tempset = Math.min(u.P + sub.Ramp, Math.max(u.P - sub.Ramp, psetForCalc));
    return tempset;
  }

  public updateFrequency(state: SimulationState, PL: number, PGMIN: number, PGMAX: number, PGSET: number) {
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
}
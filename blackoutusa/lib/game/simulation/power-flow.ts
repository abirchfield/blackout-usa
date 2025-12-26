import * as math from "mathjs";
import { GameState, BranchStatus, SubstationCategory, UnitStatus } from "../types";

// Constants specific to Power Flow
const POWER_FLOW_BASE_MW = 100.0;
const REFERENCE_BUS_NUMBER_STR = "6";
const REFERENCE_BUS_ADMITTANCE = 10000;
const GENERATION_SHUTDOWN_THRESHOLD_MW = 1;

export class PowerFlowSolver {
  /**
   * Solves the DC Power Flow for the current state.
   * Calculates phase angles (theta) and updates branch flows (P).
   * Also handles Ybus construction if invalidated (null).
   */
  public solve(state: GameState, alpha: number) {
    // 1. Update Unit P (Injection) based on Dispatch Alpha
    const pvec = this.calculatePowerInjectionVector(state, alpha);

    // 2. Build or Retrieve Ybus (Admittance Matrix)
    if (!state.Ybus) {
      this.rebuildYbus(state);
    }

    // 3. Solve for Phase Angles (Theta)
    // P = Y * Theta  =>  Theta = Yinv * P
    // We use LU decomposition for efficiency if we were solving multiple times, 
    // though here we solve once per step.
    if (!state.Yinv && state.Ybus) {
        state.Yinv = math.lup(state.Ybus);
    }
    
    if (state.Yinv) {
        const theta = math.lusolve(state.Yinv, pvec) as math.Matrix;
        this.updateBranchFlows(state, theta);
    }
  }

  private calculatePowerInjectionVector(state: GameState, alpha: number): math.Matrix {
    const pvec = math.zeros(state.nsubs, 1) as math.Matrix;
    
    for (const key in state.subs) {
      const sub = state.subs[key];
      const i = parseInt(sub.Number) - 1;
      let subPower = 0;

      for (let iu = 0; iu < sub.Units; ++iu) {
        const u = sub.U[iu];
        if (u.Status === UnitStatus.DIS || u.Status === UnitStatus.TRIP) {
          u.P = 0;
          continue;
        }

        const pmax = sub.Pmax / sub.Units;
        const pmin = sub.Pmin / sub.Units;
        
        // Calculate temporary setpoint logic (clamping)
        let psetForCalc = u.Pset;
        if (u.Status === UnitStatus.STARTUP && pmin > 0) {
            psetForCalc = pmin;
        }
        psetForCalc = Math.max(pmin, Math.min(pmax, psetForCalc));
        const tempset = Math.min(u.P + sub.Ramp, Math.max(u.P - sub.Ramp, psetForCalc));

        let tryp = 0;

        if (sub.Category === SubstationCategory.Load) {
          subPower -= u.P; // Loads consume power (negative injection)
          continue;
        } else if (u.Status === UnitStatus.SHUTDOWN) {
          tryp = Math.max(u.P - sub.Ramp, 0);
          if (tryp <= GENERATION_SHUTDOWN_THRESHOLD_MW) u.Status = UnitStatus.DIS;
        } else if (sub.Category === SubstationCategory.Wind) {
          const pavail = pmax * state.fr_wind;
          const effectiveSet = Math.min(tempset, pavail);
          tryp = Math.max(0, Math.min(pavail, u.P + sub.Ramp, effectiveSet + alpha * pmax));
        } else if (sub.Category === SubstationCategory.Solar) {
          const pavail = pmax * state.fr_solar;
          const effectiveSet = Math.min(tempset, pavail);
          tryp = Math.max(0, Math.min(pavail, u.P + sub.Ramp, effectiveSet + alpha * pmax));
        } else { // Thermal, Nuclear
          if (u.Status === UnitStatus.IN || (u.Status === UnitStatus.STARTUP && u.StatusCount >= sub.StartTime)) {
            tryp = Math.max(pmin, Math.min(pmax, u.P + sub.Ramp, tempset + alpha * pmax));
          }
        }

        // Startup Logic
        if (u.Status === UnitStatus.STARTUP) {
          if (u.StatusCount >= sub.StartTime) { 
            if (tryp >= pmin) {
              u.Status = UnitStatus.IN;
              if (pmin > 0) u.Pset = pmin;
            }
          } else { 
            tryp = 0; 
          }
        }
        
        u.P = tryp;
        subPower += u.P;
      }
      pvec.set([i, 0], subPower / POWER_FLOW_BASE_MW);
    }
    return pvec;
  }

  private rebuildYbus(state: GameState) {
    state.Ybus = math.zeros(state.nsubs, state.nsubs) as math.Matrix;
    
    for (const key in state.branches) {
      const br = state.branches[key];
      const ybr = -1 / br.Z;
      const i = parseInt(br.FromNum) - 1;
      const j = parseInt(br.ToNum) - 1;

      if (br.Status1 === BranchStatus.IN) {
        this.addAdmittance(state.Ybus, i, j, ybr);
      }
      if (br.Circuits === 2 && br.Status2 === BranchStatus.IN) {
        this.addAdmittance(state.Ybus, i, j, ybr);
      }
    }

    // Add Reference Bus Admittance (Slack Bus)
    // This is required for the DC power flow matrix to be invertible
    for (const key in state.subs) {
      const sub = state.subs[key];
      const i = parseInt(sub.Number) - 1;
      // Also ground islanded buses to prevent singular matrix
      if (sub.Number === REFERENCE_BUS_NUMBER_STR || sub.island === -1) { 
        const currentVal = state.Ybus.get([i, i]);
        state.Ybus.set([i, i], currentVal - REFERENCE_BUS_ADMITTANCE);
      }
    }
    
    // Invalidate the inverse since Ybus changed
    state.Yinv = null;
  }

  private addAdmittance(Ybus: math.Matrix, i: number, j: number, y: number) {
    Ybus.set([i, i], Ybus.get([i, i]) + y);
    Ybus.set([i, j], Ybus.get([i, j]) - y);
    Ybus.set([j, i], Ybus.get([j, i]) - y);
    Ybus.set([j, j], Ybus.get([j, j]) + y);
  }

  private updateBranchFlows(state: GameState, theta: math.Matrix) {
    for (const key in state.branches) {
      const br = state.branches[key];
      const ybr = -1 / br.Z;
      const i = parseInt(br.FromNum) - 1;
      const j = parseInt(br.ToNum) - 1;
      
      const ang_i = theta.get([i, 0]);
      const ang_j = theta.get([j, 0]);
      
      // DC Power Flow Equation: Pij = -Bij * (theta_i - theta_j)
      const pflow = -ybr * (ang_i - ang_j) * POWER_FLOW_BASE_MW;
      
      br.P = 0;
      if (br.Status1 === BranchStatus.IN) {
        br.P += pflow;
      }
      if (br.Circuits === 2 && br.Status2 === BranchStatus.IN) {
        br.P += pflow;
      }
    }
  }
}

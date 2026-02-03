import { GameState, SubstationCategory, UnitStatus, BranchStatus, AlertHandler } from "../types";

export class GridOperator {
  public toggleUnitStatus(state: GameState, subId: string, unitIndex: number) {
    const sub = state.subs[subId];
    if (!sub) return;
    const u = sub.U[unitIndex];
    if (!u) return;

    if (sub.Category === SubstationCategory.Load) {
        if (u.Status === UnitStatus.DIS) u.Status = UnitStatus.IN;
        else if (u.Status === UnitStatus.IN) u.Status = UnitStatus.DIS;
    } else {
        if (u.Status === UnitStatus.DIS) {
            u.Status = UnitStatus.STARTUP;
            u.StatusCount = 0;
        } else if (u.Status === UnitStatus.IN || u.Status === UnitStatus.STARTUP) {
            u.Status = UnitStatus.SHUTDOWN;
            u.StatusCount = 0;
        }
    }
    state.Ybus = null; // Invalidate Ybus on topology change
  }

  public toggleBranchCircuitStatus(state: GameState, branchId: string, circuitNum: 1 | 2) {
      const branch = state.branches[branchId];
      if (!branch) return;

      if (circuitNum === 1 && branch.Status1 !== BranchStatus.TRIP) {
          branch.Status1 = branch.Status1 === BranchStatus.IN ? BranchStatus.DIS : BranchStatus.IN;
      } else if (circuitNum === 2 && branch.Circuits === 2 && branch.Status2 !== BranchStatus.TRIP) {
          branch.Status2 = branch.Status2 === BranchStatus.IN ? BranchStatus.DIS : BranchStatus.IN;
      }
      state.Ybus = null; // Invalidate Ybus on topology change
  }

  public setUnitSetpoint(state: GameState, subId: string, unitIndex: number, newSetpoint: number) {
    const sub = state.subs[subId];
    if (!sub || !sub.U[unitIndex]) return;
    if (!isNaN(newSetpoint)) {
      const pmax_unit = sub.Pmax / sub.Units;
      const pmin_unit = sub.Pmin / sub.Units;
      const clampedSetpoint = Math.max(pmin_unit, Math.min(pmax_unit, newSetpoint));
      sub.U[unitIndex].Pset = clampedSetpoint;
    }
  }

  public disconnectSmallestLoad(state: GameState, onAlert?: AlertHandler) {
    let smallestLoadSub = null;
    let minPmax = Infinity;

    for (const key in state.subs) {
      const sub = state.subs[key];
      if (sub.Category === SubstationCategory.Load && sub.Pmax < minPmax) {
        const hasActiveUnit = sub.U.some(u => u.Status === UnitStatus.IN);
        if (hasActiveUnit) {
          minPmax = sub.Pmax;
          smallestLoadSub = sub;
        }
      }
    }

    if (smallestLoadSub) {
      onAlert?.({ message: `Shedding smallest load: ${smallestLoadSub.Name}.`, critical: false });
      for (let i = 0; i < smallestLoadSub.Units; i++) {
        if (smallestLoadSub.U[i].Status === UnitStatus.IN) {
          this.toggleUnitStatus(state, smallestLoadSub.Number, i);
        }
      }
    }
  }

  public disconnectMostLoadedLine(state: GameState, onAlert?: AlertHandler) {
    let mostLoadedBranch = null;
    let maxLoading = -1;

    for (const key in state.branches) {
      const branch = state.branches[key];
      const capacity = branch.Pmax * branch.Circuits;
      if (capacity > 0 && (branch.Status1 === BranchStatus.IN || branch.Status2 === BranchStatus.IN)) {
        const loading = Math.abs(branch.P) / capacity;
        if (loading > maxLoading) {
          maxLoading = loading;
          mostLoadedBranch = branch;
        }
      }
    }

    if (mostLoadedBranch) {
      onAlert?.({ message: `Tripping most loaded line: ${mostLoadedBranch.sub1?.Name}-${mostLoadedBranch.sub2?.Name}.`, critical: false });
      if (mostLoadedBranch.Status1 === BranchStatus.IN) {
        this.toggleBranchCircuitStatus(state, mostLoadedBranch.Number, 1);
      }
      if (mostLoadedBranch.Circuits === 2 && mostLoadedBranch.Status2 === BranchStatus.IN) {
        this.toggleBranchCircuitStatus(state, mostLoadedBranch.Number, 2);
      }
    }
  }

  public disconnectLargestLoad(state: GameState, onAlert?: AlertHandler) {
    let largestLoadSub = null;
    let maxPmax = -1;

    for (const key in state.subs) {
      const sub = state.subs[key];
      if (sub.Category === SubstationCategory.Load && sub.Pmax > maxPmax) {
        const hasActiveUnit = sub.U.some(u => u.Status === UnitStatus.IN);
        if (hasActiveUnit) {
          maxPmax = sub.Pmax;
          largestLoadSub = sub;
        }
      }
    }

    if (largestLoadSub) {
      onAlert?.({ message: `Emergency load shed: Disconnecting largest load ${largestLoadSub.Name}.`, critical: true });
      for (let i = 0; i < largestLoadSub.Units; i++) {
        if (largestLoadSub.U[i].Status === UnitStatus.IN) {
          this.toggleUnitStatus(state, largestLoadSub.Number, i);
        }
      }
    }
  }

  public rampAllGenerationUp(state: GameState, onAlert?: AlertHandler) {
    onAlert?.({ message: "Ramping all available generation to maximum.", critical: false });
    for (const key in state.subs) {
      const sub = state.subs[key];
      const isDispatchable = sub.Category === SubstationCategory.Thermal ||
                             sub.Category === SubstationCategory.Nuclear ||
                             sub.Category === SubstationCategory.GasCombinedCycle ||
                             sub.Category === SubstationCategory.GasTurbine ||
                             sub.Category === SubstationCategory.CoalFiredSteam;

      if (isDispatchable) {
        const pmax_unit = sub.Pmax / sub.Units;
        for (let i = 0; i < sub.Units; i++) {
          if (sub.U[i].Status === UnitStatus.IN) {
            this.setUnitSetpoint(state, sub.Number, i, pmax_unit);
          }
        }
      }
    }
  }
}

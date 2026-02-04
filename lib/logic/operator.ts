import { GameState, Substation, SubstationCategory, UnitStatus, BranchStatus, AlertHandler } from "../types";
import { isDispatchableCategory } from "../utils";

export function toggleUnitStatus(state: GameState, subId: string, unitIndex: number) {
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

export function toggleBranchCircuitStatus(state: GameState, branchId: string, circuitNum: 1 | 2) {
  const branch = state.branches[branchId];
  if (!branch) return;

  if (circuitNum === 1 && branch.Status1 !== BranchStatus.TRIP) {
    branch.Status1 = branch.Status1 === BranchStatus.IN ? BranchStatus.DIS : BranchStatus.IN;
  } else if (circuitNum === 2 && branch.Circuits === 2 && branch.Status2 !== BranchStatus.TRIP) {
    branch.Status2 = branch.Status2 === BranchStatus.IN ? BranchStatus.DIS : BranchStatus.IN;
  }
  state.Ybus = null; // Invalidate Ybus on topology change
}

export function setUnitSetpoint(state: GameState, subId: string, unitIndex: number, newSetpoint: number) {
  const sub = state.subs[subId];
  if (!sub || !sub.U[unitIndex]) return;
  if (!isNaN(newSetpoint)) {
    const pmax_unit = sub.Pmax / sub.Units;
    const pmin_unit = sub.Pmin / sub.Units;
    const clampedSetpoint = Math.max(pmin_unit, Math.min(pmax_unit, newSetpoint));
    sub.U[unitIndex].Pset = clampedSetpoint;
  }
}

function findActiveLoadSubstation(
  state: GameState,
  compare: 'smallest' | 'largest'
) {
  let bestSub = null;
  let bestPmax = compare === 'smallest' ? Infinity : -1;

  for (const key in state.subs) {
    const sub = state.subs[key];
    if (sub.Category !== SubstationCategory.Load) continue;
    const isBetter = compare === 'smallest' ? sub.Pmax < bestPmax : sub.Pmax > bestPmax;
    if (isBetter && sub.U.some(u => u.Status === UnitStatus.IN)) {
      bestPmax = sub.Pmax;
      bestSub = sub;
    }
  }
  return bestSub;
}

function disconnectAllUnits(state: GameState, sub: Substation) {
  for (let i = 0; i < sub.Units; i++) {
    if (sub.U[i].Status === UnitStatus.IN) {
      toggleUnitStatus(state, sub.Number, i);
    }
  }
}

export function disconnectSmallestLoad(state: GameState, onAlert?: AlertHandler) {
  const sub = findActiveLoadSubstation(state, 'smallest');
  if (sub) {
    onAlert?.({ message: `Shedding smallest load: ${sub.Name}.`, critical: false });
    disconnectAllUnits(state, sub);
  }
}

export function disconnectMostLoadedLine(state: GameState, onAlert?: AlertHandler) {
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
      toggleBranchCircuitStatus(state, mostLoadedBranch.Number, 1);
    }
    if (mostLoadedBranch.Circuits === 2 && mostLoadedBranch.Status2 === BranchStatus.IN) {
      toggleBranchCircuitStatus(state, mostLoadedBranch.Number, 2);
    }
  }
}

export function disconnectLargestLoad(state: GameState, onAlert?: AlertHandler) {
  const sub = findActiveLoadSubstation(state, 'largest');
  if (sub) {
    onAlert?.({ message: `Emergency load shed: Disconnecting largest load ${sub.Name}.`, critical: true });
    disconnectAllUnits(state, sub);
  }
}

export function rampAllGenerationUp(state: GameState, onAlert?: AlertHandler) {
  onAlert?.({ message: "Ramping all available generation to maximum.", critical: false });
  for (const key in state.subs) {
    const sub = state.subs[key];
    if (isDispatchableCategory(sub.Category)) {
      const pmax_unit = sub.Pmax / sub.Units;
      for (let i = 0; i < sub.Units; i++) {
        if (sub.U[i].Status === UnitStatus.IN) {
          setUnitSetpoint(state, sub.Number, i, pmax_unit);
        }
      }
    }
  }
}

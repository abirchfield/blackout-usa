import { SimState, RawGridData, GameStatistics, Substation, SubstationCategory, UnitStatus, BranchStatus, SimulationAction, AlertHandler, HintHandler, IScenario } from "../types";

/** Result of a single simulation tick. */
export interface TickResult {
  /** True if the day ended (t >= duration OR blackout). */
  dayComplete: boolean;
  /** True if frequency dropped below blackout threshold. */
  blackout: boolean;
}

/** Grid simulation model — shields the engine from computational details. */
export interface IGridModel {
  init(state: SimState, gridData: RawGridData, referenceBus: string): void;
  startDay(day: number, scenario: IScenario | null, onAlert: AlertHandler, onHint: HintHandler): void;
  tick(advanceTime: boolean, onAlert: AlertHandler, onHint: HintHandler): TickResult;
  dispatch(action: SimulationAction, onAlert?: AlertHandler): void;
  getStats(): GameStatistics;
  clearSolverCache(): void;
  toggleUnit(subId: string, unitIndex: number): void;
  abortUnitTransition(subId: string, unitIndex: number): void;
  toggleBranch(branchId: string, circuitNum: 1 | 2): void;
  setUnitSetpoint(subId: string, unitIndex: number, value: number): void;
  disconnectSmallestLoad(onAlert?: AlertHandler): void;
  disconnectMostLoadedLine(onAlert?: AlertHandler): void;
  disconnectLargestLoad(onAlert?: AlertHandler): void;
  rampAllGenerationUp(onAlert?: AlertHandler): void;
}

import { getAvailableCapacity, getUnitLimits, isDispatchableCategory, isUnitInactive, isVariableRenewable, formatGameTime } from "../utils";
import { FREQUENCY_BLACKOUT_THRESHOLD, FREQUENCY_DROOP, FREQUENCY_ADJUSTMENT_THRESHOLD_MW, MIN_GENERATION_FOR_FREQ_STABILITY_MW, BASE_FREQUENCY, GAME_DURATION_TICKS } from "./constants";

// Internal logic modules (hidden from engine)
import { solveFlow, findAlpha, rampLimitedSetpoint } from "./power-flow";
import { detectIslands, checkContingencies } from "./grid-analysis";
import { updateMetrics, initGrid, resetToDefaults, advanceUnits, initWeather } from "./grid-data";

export class GridModel implements IGridModel {
  private state!: SimState;
  private scenario: IScenario | null = null;

  init(state: SimState, gridData: RawGridData, referenceBus: string): void {
    this.state = state;
    initGrid(state, gridData, referenceBus);
  }

  startDay(day: number, scenario: IScenario | null, onAlert: AlertHandler, onHint: HintHandler): void {
    this.scenario = scenario;
    resetToDefaults(this.state);
    this.state.day = day;
    initWeather(this.state);
    scenario?.start(this.state, onAlert, onHint);
  }

  /**
   * Simulation pipeline — one game tick.
   * Phase 1 — Events:    scenario.update()
   * Phase 2 — Integrity: checkContingencies(), detectIslands(), advanceUnits()
   * Phase 3 — Balance:   applyLoads(), getBalance(), adjustFrequency()
   * Phase 4 — Solve:     findAlpha(), solveFlow(), updateMetrics()
   */
  tick(advanceTime: boolean, onAlert: AlertHandler, onHint: HintHandler): TickResult {
    this.state._vSim++;

    if (this.state.t >= GAME_DURATION_TICKS) {
      this.clearSolverCache();
      return { dayComplete: true, blackout: false };
    }

    if (advanceTime) this.state.t += 1;

    // Phase 1 — Events: scenario-specific mutations (weather, trips, hints)
    this.scenario?.update(this.state, onAlert, onHint);

    // Phase 2 — Integrity: probabilistic tripping, island detection, unit transitions
    checkContingencies(this.state, onAlert);
    detectIslands(this.state, onAlert);
    advanceUnits(this.state);

    // Phase 3 — Balance: set load power, compute gen bounds, adjust frequency
    this.applyLoads();
    const balance = this.getBalance();
    this.adjustFrequency(balance);

    if (this.state.frequency < FREQUENCY_BLACKOUT_THRESHOLD) {
      this.clearSolverCache();
      return { dayComplete: true, blackout: true };
    }

    // Phase 4 — Solve: dispatch generation, DC power flow, per-tick metrics
    const alpha = findAlpha(this.state, balance.PL);
    solveFlow(this.state, alpha);
    updateMetrics(this.state);

    return { dayComplete: false, blackout: false };
  }

  dispatch(action: SimulationAction, onAlert?: AlertHandler): void {
    this.state._vSim++;
    switch (action.type) {
      case 'TOGGLE_UNIT':                  this.toggleUnit(action.subId, action.unitIndex); break;
      case 'ABORT_UNIT_TRANSITION':        this.abortUnitTransition(action.subId, action.unitIndex); break;
      case 'TOGGLE_BRANCH':               this.toggleBranch(action.branchId, action.circuitNum); break;
      case 'SET_SETPOINT':                this.setUnitSetpoint(action.subId, action.unitIndex, action.value); break;
      case 'DISCONNECT_SMALLEST_LOAD':    this.disconnectSmallestLoad(onAlert); break;
      case 'DISCONNECT_MOST_LOADED_LINE': this.disconnectMostLoadedLine(onAlert); break;
      case 'EMERGENCY_LOAD_SHED':         this.disconnectLargestLoad(onAlert); break;
      case 'RAMP_ALL_GENERATION':         this.rampAllGenerationUp(onAlert); break;
    }
  }

  getStats(): GameStatistics {
    return {
      ...this.state.metrics,
      day: this.state.day,
      timeStr: formatGameTime(this.state.t),
      timeStep: this.state.t,
      frequency: this.state.frequency,
      frWind: this.state.frWind,
      frSolar: this.state.frSolar,
    };
  }

  clearSolverCache(): void {
    this.state.Ybus = null;
    this.state.Yinv = null;
  }

  // --- Balance (Phase 3 pipeline) ---

  /** Set load u.P to current demand and zero inactive units. Call before getBalance()/findAlpha(). */
  private applyLoads(): void {
    for (const sub of Object.values(this.state.subs)) {
      const { pmax } = getUnitLimits(sub);
      for (let iu = 0; iu < sub.Units; ++iu) {
        const u = sub.U[iu];
        if (sub.Category === SubstationCategory.Load && u.Status === UnitStatus.IN) {
          u.P = pmax * this.state.frLoad;
        } else if (isUnitInactive(u.Status)) {
          u.P = 0;
        }
      }
    }
  }

  private getBalance() {
    let PL = 0, PGSET = 0, PGMIN = 0, PGMAX = 0;

    for (const sub of Object.values(this.state.subs)) {
      const { pmax, pmin } = getUnitLimits(sub);

      for (let iu = 0; iu < sub.Units; ++iu) {
        const u = sub.U[iu];
        if (isUnitInactive(u.Status)) continue;

        if (sub.Category === SubstationCategory.Load) {
          PL += pmax * this.state.frLoad;
          continue;
        }

        const tempset = rampLimitedSetpoint(u, sub, pmax, pmin);

        if (u.Status === UnitStatus.SHUTDOWN) {
          const rampDown = Math.max(0, u.P - sub.Ramp);
          PGMIN += rampDown; PGMAX += rampDown; PGSET += rampDown;
          continue;
        }

        if (isVariableRenewable(sub.Category)) {
          const pavail = getAvailableCapacity(pmax, sub.Category, this.state.frWind, this.state.frSolar);
          PGMIN += Math.max(u.P - sub.Ramp, 0);
          PGMAX += Math.min(u.P + sub.Ramp, pavail);
          PGSET += Math.min(tempset, pavail);
          continue;
        }

        // Dispatchable unit (thermal/nuclear/gas): IN or STARTUP
        if (u.Status === UnitStatus.STARTUP && u.StatusCount < sub.StartTime) continue;

        if (u.Status === UnitStatus.STARTUP) {
          PGMIN += Math.min(u.P + sub.Ramp, Math.max(pmin, u.P - sub.Ramp));
        } else {
          PGMIN += Math.max(pmin, u.P - sub.Ramp);
        }
        PGMAX += Math.min(pmax, u.P + sub.Ramp);
        PGSET += tempset;
      }
    }
    return { PL, PGSET, PGMIN, PGMAX };
  }

  private adjustFrequency({ PL, PGMIN, PGMAX, PGSET }: { PL: number; PGMIN: number; PGMAX: number; PGSET: number }): void {
    if (PGMAX < MIN_GENERATION_FOR_FREQ_STABILITY_MW) {
      this.state.frequency = 0.0;
      return;
    }
    if (PL <= PGMIN) {
      this.state.frequency += (PL - PGMIN < -FREQUENCY_ADJUSTMENT_THRESHOLD_MW) ? 0.05 : 0.01;
      return;
    }
    if (PL >= PGMAX) {
      this.state.frequency -= (PL - PGMAX > FREQUENCY_ADJUSTMENT_THRESHOLD_MW) ? 0.05 : 0.01;
      return;
    }
    if (PGMAX > PGMIN) {
      const PMAKE = PL - PGSET;
      const ftarg = BASE_FREQUENCY - FREQUENCY_DROOP * PMAKE / (PGMAX - PGMIN);
      this.state.frequency += this.state.frequency < ftarg ? 0.01 : -0.01;
    }
  }

  // --- Operator Actions ---

  toggleUnit(subId: string, unitIndex: number): void {
    const sub = this.state.subs[subId];
    if (!sub) return;
    const u = sub.U[unitIndex];
    if (!u) return;

    // Loads toggle directly between IN and DIS
    if (sub.Category === SubstationCategory.Load) {
      if (u.Status === UnitStatus.DIS) u.Status = UnitStatus.IN;
      else if (u.Status === UnitStatus.IN) u.Status = UnitStatus.DIS;
      return;
    }

    // Generators use STARTUP/SHUTDOWN transitions
    if (u.Status === UnitStatus.DIS) {
      u.Status = UnitStatus.STARTUP;
      u.StatusCount = 0;
    } else if (u.Status === UnitStatus.IN || u.Status === UnitStatus.STARTUP) {
      u.Status = UnitStatus.SHUTDOWN;
      u.StatusCount = 0;
    }
  }

  abortUnitTransition(subId: string, unitIndex: number): void {
    const sub = this.state.subs[subId];
    if (!sub) return;
    const u = sub.U[unitIndex];
    if (!u) return;
    if (sub.Category === SubstationCategory.Load) return;

    if (u.Status === UnitStatus.STARTUP) {
      u.Status = UnitStatus.DIS;
      u.StatusCount = 0;
      u.P = 0;
      u.Pset = u.P0;
    } else if (u.Status === UnitStatus.SHUTDOWN) {
      u.Status = UnitStatus.IN;
      u.StatusCount = 0;
    }
  }

  toggleBranch(branchId: string, circuitNum: 1 | 2): void {
    const br = this.state.branches[branchId];
    if (!br) return;

    if (circuitNum === 1 && br.Status1 !== BranchStatus.TRIP) {
      br.Status1 = br.Status1 === BranchStatus.IN ? BranchStatus.DIS : BranchStatus.IN;
    } else if (circuitNum === 2 && br.Circuits === 2 && br.Status2 !== BranchStatus.TRIP) {
      br.Status2 = br.Status2 === BranchStatus.IN ? BranchStatus.DIS : BranchStatus.IN;
    }
    this.state.Ybus = null;
  }

  setUnitSetpoint(subId: string, unitIndex: number, value: number): void {
    const sub = this.state.subs[subId];
    if (!sub || !sub.U[unitIndex]) return;
    if (isNaN(value)) return;

    const { pmax, pmin } = getUnitLimits(sub);
    sub.U[unitIndex].Pset = Math.max(pmin, Math.min(pmax, value));
  }

  disconnectSmallestLoad(onAlert?: AlertHandler): void {
    const sub = this.findActiveLoadSubstation('smallest');
    if (!sub) return;
    onAlert?.({ message: `Shedding smallest load: ${sub.Name}.`, critical: false });
    this.disconnectAllUnits(sub);
  }

  disconnectMostLoadedLine(onAlert?: AlertHandler): void {
    let best = null;
    let maxLoading = -1;

    for (const br of Object.values(this.state.branches)) {
      const cap = br.Pmax * br.Circuits;
      if (cap <= 0) continue;
      if (br.Status1 !== BranchStatus.IN && br.Status2 !== BranchStatus.IN) continue;
      const loading = Math.abs(br.P) / cap;
      if (loading <= maxLoading) continue;
      maxLoading = loading;
      best = br;
    }

    if (!best) return;
    onAlert?.({ message: `Tripping most loaded line: ${best.sub1?.Name}-${best.sub2?.Name}.`, critical: false });
    if (best.Status1 === BranchStatus.IN) this.toggleBranch(best.Number, 1);
    if (best.Circuits === 2 && best.Status2 === BranchStatus.IN) this.toggleBranch(best.Number, 2);
  }

  disconnectLargestLoad(onAlert?: AlertHandler): void {
    const sub = this.findActiveLoadSubstation('largest');
    if (!sub) return;
    onAlert?.({ message: `Emergency load shed: Disconnecting largest load ${sub.Name}.`, critical: true });
    this.disconnectAllUnits(sub);
  }

  rampAllGenerationUp(onAlert?: AlertHandler): void {
    onAlert?.({ message: "Ramping all available generation to maximum.", critical: false });
    for (const sub of Object.values(this.state.subs)) {
      if (!isDispatchableCategory(sub.Category)) continue;
      const { pmax } = getUnitLimits(sub);
      for (let i = 0; i < sub.Units; i++) {
        if (sub.U[i].Status !== UnitStatus.IN) continue;
        this.setUnitSetpoint(sub.Number, i, pmax);
      }
    }
  }

  // --- Private helpers ---

  private findActiveLoadSubstation(compare: 'smallest' | 'largest'): Substation | null {
    let bestSub: Substation | null = null;
    let bestPmax = compare === 'smallest' ? Infinity : -1;

    for (const sub of Object.values(this.state.subs)) {
      if (sub.Category !== SubstationCategory.Load) continue;
      if (!sub.U.some(u => u.Status === UnitStatus.IN)) continue;
      const better = compare === 'smallest' ? sub.Pmax < bestPmax : sub.Pmax > bestPmax;
      if (!better) continue;
      bestPmax = sub.Pmax;
      bestSub = sub;
    }
    return bestSub;
  }

  private disconnectAllUnits(sub: Substation): void {
    for (let i = 0; i < sub.Units; i++) {
      if (sub.U[i].Status === UnitStatus.IN) this.toggleUnit(sub.Number, i);
    }
  }
}

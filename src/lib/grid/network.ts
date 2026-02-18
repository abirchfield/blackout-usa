import {
  SimState, BranchStatus, AlertHandler, Model,
} from "../types";
import { isInactive } from "../utils";
import {
  BASE_MVA, REF_ADMITTANCE,
  ALPHA_MIN, ALPHA_MAX, MAX_ITER, ALPHA_TOLERANCE,
  OVERLOAD_TRIP_CRITICAL_MULTIPLIER, PROB_TRIP_OVERLOAD_CRITICAL,
  OVERLOAD_TRIP_NORMAL_MULTIPLIER, PROB_TRIP_OVERLOAD_NORMAL,
} from "./constants";
import { SubstationModel } from "./substation";
import { UnionFind, choleskyFactorize, choleskySolve } from "./utils";

// --- Probability helpers ---

function overloadTripProbability(absFlow: number, capacity: number): number {
  if (absFlow > capacity * OVERLOAD_TRIP_CRITICAL_MULTIPLIER) return PROB_TRIP_OVERLOAD_CRITICAL;
  if (absFlow > capacity * OVERLOAD_TRIP_NORMAL_MULTIPLIER) return PROB_TRIP_OVERLOAD_NORMAL;
  return 0;
}

// --- NetworkModel ---

/** Network topology and DC power flow solver using Cholesky factorization. */
export class NetworkModel implements Model {
  private state: SimState;
  private subModels: SubstationModel[];
  private genModels: SubstationModel[];
  private onAlert: AlertHandler = () => {};

  // Pre-allocated solver buffers
  private n = 0;
  private Ybus!: Float64Array;     // n*n row-major — negated Ybus (positive definite), Cholesky-factorized in-place
  private pvec!: Float64Array;
  private theta!: Float64Array;
  private bNeg!: Float64Array;     // scratch for negated pvec (Cholesky solves -Ybus·θ = -pvec)
  private dirty = true;

  // Island detection
  private uf!: UnionFind;

  // =========================================================================
  // Lifecycle
  // =========================================================================

  constructor(state: SimState, subModels: SubstationModel[], genModels: SubstationModel[]) {
    this.state = state;
    this.subModels = subModels;
    this.genModels = genModels;
  }

  /** Resolve branch endpoint references and allocate solver buffers. */
  setup(): void {
    // All derived fields (fromIdx, toIdx, ybr, dist) are pre-computed in grid-data.json.
    // Only set sub1/sub2 object references (can't be serialized in JSON).
    for (const br of Object.values(this.state.branches)) {
      br.sub1 = this.state.subs[br.FromNum];
      br.sub2 = this.state.subs[br.ToNum];
    }
    this.state.branchList = Object.values(this.state.branches);

    // Allocate solver buffers
    this.n = this.state.nsubs;
    const n = this.n;
    this.Ybus = new Float64Array(n * n);
    this.pvec = new Float64Array(n);
    this.theta = new Float64Array(n);
    this.bNeg = new Float64Array(n);
    this.uf = new UnionFind(n);
    this.dirty = true;
  }

  /** Reset all branches to in-service with zero flow. */
  reset(): void {
    for (const br of this.state.branchList) {
      br.P = 0;
      br.Status = BranchStatus.IN;
    }
    for (const m of this.subModels) {
      m.data.island = 0;
    }
    this.dirty = true;
  }

  /** Mark Ybus as dirty so it's rebuilt on the next solve. */
  invalidate(): void {
    this.dirty = true;
  }

  /** Set the callback for branch-level alerts. */
  setAlertHandler(handler: AlertHandler): void {
    this.onAlert = handler;
  }

  // =========================================================================
  // DC Power Flow
  // =========================================================================

  /** Run DC power flow: find dispatch alpha, build injections, Cholesky-solve Ybus. */
  solve(totalLoad: number): void {
    const alpha = this.findAlpha(totalLoad);
    this.buildInjections(alpha);
    if (this.dirty && !this.buildYbus()) {
      // Cholesky failed — zero all flows as a safe fallback
      console.warn('Cholesky factorization failed — zeroing all branch flows');
      for (const br of this.state.branchList) br.P = 0;
      return;
    }
    // Cholesky was factorized on -Ybus (positive definite), so solve with -pvec
    const n = this.n;
    for (let i = 0; i < n; i++) this.bNeg[i] = -this.pvec[i];
    choleskySolve(this.Ybus, this.bNeg, this.theta, n);
    this.calcFlows();
  }

  /** Binary search for dispatch level alpha that balances total generation to total load. */
  private findAlpha(totalLoad: number): number {
    let lo = ALPHA_MIN, hi = ALPHA_MAX, alpha = 0;
    for (let iter = 0; iter < MAX_ITER; iter++) {
      alpha = 0.5 * (lo + hi);
      if (hi - lo < ALPHA_TOLERANCE) break;

      let deficit = totalLoad; // positive = load exceeds generation
      for (const m of this.genModels) {
        for (const g of m.gens) {
          if (isInactive(g.unit.Status)) continue;
          deficit -= g.output(alpha);
        }
      }
      if (deficit > 0) lo = alpha;
      else hi = alpha;
    }
    return alpha;
  }

  private buildInjections(alpha: number): void {
    const pvec = this.pvec;
    pvec.fill(0);

    for (const m of this.subModels) {
      let busInjection = 0;
      for (const g of m.gens) {
        if (isInactive(g.unit.Status)) continue;
        g.unit.P = g.output(alpha);
        busInjection += g.unit.P;
      }
      for (const l of m.loads) {
        if (isInactive(l.unit.Status)) continue;
        busInjection -= l.unit.P;
      }
      pvec[m.idx] = busInjection / BASE_MVA;
    }
  }

  /**
   * Build the bus admittance matrix (Ybus) and Cholesky-factorize it in-place.
   * Ybus is negated before factorization so it becomes positive-definite,
   * which is the requirement for Cholesky decomposition (LL^T).
   * Returns false if factorization fails (singular matrix due to disconnected topology).
   */
  private buildYbus(): boolean {
    const n = this.n;
    const Y = this.Ybus;
    Y.fill(0);

    for (const br of this.state.branchList) {
      if (br.Status === BranchStatus.IN) {
        this.addAdmittance(br.fromIdx, br.toIdx, br.ybr);
      }
    }

    // Reference admittance on slack bus and islanded buses keeps Ybus non-singular
    for (const m of this.subModels) {
      if (m.id === this.state.referenceBus || m.data.island === -1) {
        Y[m.idx * n + m.idx] -= REF_ADMITTANCE;
      }
    }

    // Negate Ybus → positive definite for Cholesky factorization
    const len = n * n;
    for (let i = 0; i < len; i++) Y[i] = -Y[i];
    if (!choleskyFactorize(Y, n)) {
      return false;  // dirty stays true → rebuilt next tick
    }
    this.dirty = false;
    return true;
  }

  private addAdmittance(i: number, j: number, y: number): void {
    const n = this.n;
    const Y = this.Ybus;
    Y[i * n + i] += y;
    Y[i * n + j] -= y;
    Y[j * n + i] -= y;
    Y[j * n + j] += y;
  }

  /** Compute branch MW flows from voltage angles: P_ij = y_ij * (θ_i − θ_j) * S_base. */
  private calcFlows(): void {
    const theta = this.theta;
    for (const br of this.state.branchList) {
      br.P = br.Status === BranchStatus.IN
        ? br.ybr * (theta[br.fromIdx] - theta[br.toIdx]) * BASE_MVA
        : 0;
    }
  }

  // =========================================================================
  // Topology: tick, island detection, overload trips
  // =========================================================================

  /** Check for overload trips and detect electrical islands. */
  tick(_dt: number): void {
    this.tripOverloads();
    this.findIslands();
  }

  /** Use Union-Find to detect substations disconnected from the reference bus and trip their units. */
  private findIslands(): void {
    this.uf.reset();

    for (const br of this.state.branchList) {
      if (br.Status !== BranchStatus.IN) continue;
      this.uf.union(br.fromIdx, br.toIdx);
    }

    const refIdx = this.state.refIdx;
    if (refIdx < 0) return;
    const rootSet = this.uf.find(refIdx);

    for (const m of this.subModels) {
      const connected = this.uf.find(m.idx) === rootSet;
      m.data.island = connected ? 0 : -1;
      if (connected) continue;

      const { genTripped, loadTripped } = m.tripActiveUnits();
      for (const iu of genTripped) {
        this.onAlert({ message: `Generator ${m.name} #${iu + 1} tripped due to separation from grid`, critical: true });
      }
      for (const iu of loadTripped) {
        this.onAlert({ message: `Load ${m.name} #${iu + 1} tripped due to separation from grid`, critical: true });
      }
    }
  }

  private tripOverloads(): void {
    for (const br of this.state.branchList) {
      if (br.Status !== BranchStatus.IN) continue;
      const tripProb = overloadTripProbability(Math.abs(br.P), br.Pmax);
      if (tripProb === 0 || Math.random() >= tripProb) continue;

      br.Status = BranchStatus.TRIP;
      this.onAlert({ message: `Branch ${br.sub1?.Name}-${br.sub2?.Name} tripped on overloading!`, critical: true });
      this.invalidate();
    }
  }

  // =========================================================================
  // Operator Actions (user-facing)
  // =========================================================================

  /** Open or close a branch (operator action). */
  toggleBranch(branchId: string): void {
    const br = this.state.branches[branchId];
    if (!br || br.Status === BranchStatus.TRIP) return;
    br.Status = br.Status === BranchStatus.IN ? BranchStatus.DIS : BranchStatus.IN;
    this.invalidate();
  }

  /** Open the branch with the highest loading percentage (and its sibling). */
  disconnectHottestLine(): { name1: string; name2: string } | null {
    let best = null as typeof this.state.branchList[0] | null;
    let maxLoading = -1;

    for (const br of this.state.branchList) {
      if (br.Status !== BranchStatus.IN || br.Pmax <= 0) continue;
      const loading = Math.abs(br.P) / br.Pmax;
      if (loading <= maxLoading) continue;
      maxLoading = loading;
      best = br;
    }

    if (!best) return null;
    this.toggleBranch(best.Number);
    // Also trip sibling if it exists and is active
    if (best.sibling) {
      const sib = this.state.branches[best.sibling];
      if (sib && sib.Status === BranchStatus.IN) this.toggleBranch(sib.Number);
    }
    return { name1: best.sub1?.Name ?? '', name2: best.sub2?.Name ?? '' };
  }

  // =========================================================================
  // Scenario Mutations (scripted)
  // =========================================================================

  /** Force-trip a branch (scenario scripting). */
  tripBranch(branchId: string): void {
    const br = this.state.branches[branchId];
    if (!br) return;
    br.Status = BranchStatus.TRIP;
    this.invalidate();
  }

  /** Randomly trip branches by probability (scenario scripting). */
  randomTrips(branchIds: string[], probability: number, reason?: string): void {
    for (const id of branchIds) {
      if (Math.random() >= probability) continue;
      const br = this.state.branches[id];
      if (!br || br.Status === BranchStatus.TRIP) continue;
      br.Status = BranchStatus.TRIP;
      this.invalidate();
      const suffix = reason ? ` ${reason}` : '';
      this.onAlert({ message: `${br.sub1?.Name}-${br.sub2?.Name} transmission line trips${suffix}`, critical: true });
    }
  }

  /** Move a tripped branch to out-of-service (allows manual re-close). */
  readyBranch(branchId: string): void {
    const br = this.state.branches[branchId];
    if (!br) return;
    if (br.Status === BranchStatus.TRIP) {
      br.Status = BranchStatus.DIS;
      this.invalidate();
    }
  }

}

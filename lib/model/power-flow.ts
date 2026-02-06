import * as math from "mathjs";
import { SimState, BranchStatus, SubstationCategory, UnitStatus, Substation, Unit } from "../types";
import { getAvailableCapacity, getUnitLimits, isUnitInactive, isVariableRenewable } from "../utils";
import { BASE_MVA, REF_ADMITTANCE, ALPHA_MIN, ALPHA_MAX, MAX_ITER } from "./constants";

// --- Unit Output Computation ---

export function rampLimitedSetpoint(u: Unit, sub: Substation, pmax: number, pmin: number): number {
  let pset = u.Pset;
  if (u.Status === UnitStatus.STARTUP && pmin > 0) pset = pmin;
  pset = Math.max(pmin, Math.min(pmax, pset));
  return Math.min(u.P + sub.Ramp, Math.max(u.P - sub.Ramp, pset));
}

/** Calculate the target power output for a single generator unit given alpha scaling. No state mutations. */
function computeUnitOutput(u: Unit, sub: Substation, alpha: number, frWind: number, frSolar: number, pmax: number, pmin: number): number {
  const tempset = rampLimitedSetpoint(u, sub, pmax, pmin);

  if (u.Status === UnitStatus.SHUTDOWN)
    return Math.max(u.P - sub.Ramp, 0);

  if (isVariableRenewable(sub.Category)) {
    const pavail = getAvailableCapacity(pmax, sub.Category, frWind, frSolar);
    return Math.max(0, Math.min(pavail, u.P + sub.Ramp, Math.min(tempset, pavail) + alpha * pmax));
  }

  if (u.Status === UnitStatus.IN || (u.Status === UnitStatus.STARTUP && u.StatusCount >= sub.StartTime))
    return Math.max(pmin, Math.min(pmax, u.P + sub.Ramp, tempset + alpha * pmax));

  return 0;
}

// --- Alpha Search ---

/** Binary search for alpha ∈ [-1,1] that balances generation to load. Pure computation — call applyLoads() first. */
export function findAlpha(state: SimState, PL: number): number {
  let alpha0 = ALPHA_MIN, alpha1 = ALPHA_MAX, alpha = 0;
  for (let iter = 0; iter < MAX_ITER; iter++) {
    let PBAL = PL;
    alpha = 0.5 * (alpha0 + alpha1);
    for (const sub of Object.values(state.subs)) {
      if (sub.Category === SubstationCategory.Load) continue;
      const { pmax, pmin } = getUnitLimits(sub);
      for (let iu = 0; iu < sub.Units; ++iu) {
        const u = sub.U[iu];
        if (isUnitInactive(u.Status)) continue;
        PBAL -= computeUnitOutput(u, sub, alpha, state.frWind, state.frSolar, pmax, pmin);
      }
    }
    if (PBAL > 0) alpha0 = alpha;
    else alpha1 = alpha;
  }
  return alpha;
}

// --- DC Power Flow Solver ---

/**
 * Solves the DC Power Flow for the current state.
 * Calculates phase angles (theta) and updates branch flows (P).
 */
export function solveFlow(state: SimState, alpha: number) {
  const pvec = injectionVector(state, alpha);

  if (!state.Ybus) rebuildYbus(state);

  if (!state.Yinv && state.Ybus) {
    state.Yinv = math.lup(state.Ybus);
  }

  if (state.Yinv) {
    const theta = math.lusolve(state.Yinv, pvec) as math.Matrix;
    updateBranchFlows(state, theta);
  }
}

function injectionVector(state: SimState, alpha: number): math.Matrix {
  const pvec = math.zeros(state.nsubs, 1) as math.Matrix;

  for (const sub of Object.values(state.subs)) {
    let subPower = 0;
    const { pmax, pmin } = getUnitLimits(sub);

    for (let iu = 0; iu < sub.Units; ++iu) {
      const u = sub.U[iu];
      if (isUnitInactive(u.Status)) continue;
      if (sub.Category === SubstationCategory.Load) { subPower -= u.P; continue; }
      u.P = computeUnitOutput(u, sub, alpha, state.frWind, state.frSolar, pmax, pmin);
      subPower += u.P;
    }
    pvec.set([sub.idx, 0], subPower / BASE_MVA);
  }
  return pvec;
}

function rebuildYbus(state: SimState) {
  state.Ybus = math.zeros(state.nsubs, state.nsubs) as math.Matrix;

  for (const br of Object.values(state.branches)) {
    if (br.Status1 === BranchStatus.IN) addAdmittance(state.Ybus, br.fromIdx, br.toIdx, br.ybr);
    if (br.Circuits === 2 && br.Status2 === BranchStatus.IN) addAdmittance(state.Ybus, br.fromIdx, br.toIdx, br.ybr);
  }

  for (const sub of Object.values(state.subs)) {
    if (sub.Number === state.referenceBus || sub.island === -1) {
      const idx = sub.idx;
      state.Ybus.set([idx, idx], state.Ybus.get([idx, idx]) - REF_ADMITTANCE);
    }
  }

  state.Yinv = null;
}

function addAdmittance(Ybus: math.Matrix, i: number, j: number, y: number) {
  Ybus.set([i, i], Ybus.get([i, i]) + y);
  Ybus.set([i, j], Ybus.get([i, j]) - y);
  Ybus.set([j, i], Ybus.get([j, i]) - y);
  Ybus.set([j, j], Ybus.get([j, j]) + y);
}

function updateBranchFlows(state: SimState, theta: math.Matrix) {
  for (const br of Object.values(state.branches)) {
    const ang_i = theta.get([br.fromIdx, 0]);
    const ang_j = theta.get([br.toIdx, 0]);
    const pflow = br.ybr * (ang_i - ang_j) * BASE_MVA;

    br.P = 0;
    if (br.Status1 === BranchStatus.IN) br.P += pflow;
    if (br.Circuits === 2 && br.Status2 === BranchStatus.IN) br.P += pflow;
  }
}

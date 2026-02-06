import { SimState, BranchStatus, UnitStatus, SubstationCategory, AlertHandler } from "../types";
import { isUnitInactive } from "../utils";
import {
  FREQ_TRIP_CRITICAL_LOW, FREQ_TRIP_CRITICAL_HIGH, PROB_TRIP_FREQ_CRITICAL,
  FREQ_TRIP_HIGH_LOW, FREQ_TRIP_HIGH_HIGH, PROB_TRIP_FREQ_HIGH,
  FREQ_TRIP_NORMAL_LOW, FREQ_TRIP_NORMAL_HIGH, PROB_TRIP_FREQ_NORMAL,
  OVERLOAD_TRIP_CRITICAL_MULTIPLIER, PROB_TRIP_OVERLOAD_CRITICAL,
  OVERLOAD_TRIP_NORMAL_MULTIPLIER, PROB_TRIP_OVERLOAD_NORMAL,
} from "./constants";

// --- Topology Constants ---
const ROOT_ISLAND = 0;
const UNASSIGNED_ISLAND = -1;

// --- Union-Find (reusable buffers, allocated once) ---

let _parent: Int32Array | null = null;
let _rank: Int32Array | null = null;

function ensureUF(n: number) {
  if (!_parent || _parent.length < n) {
    _parent = new Int32Array(n);
    _rank = new Int32Array(n);
  }
}

function ufFind(x: number): number {
  const p = _parent!;
  while (p[x] !== x) { p[x] = p[p[x]]; x = p[x]; } // path halving
  return x;
}

function ufUnion(a: number, b: number) {
  const p = _parent!, r = _rank!;
  let ra = ufFind(a), rb = ufFind(b);
  if (ra === rb) return;
  if (r[ra] < r[rb]) { const t = ra; ra = rb; rb = t; }
  p[rb] = ra;
  if (r[ra] === r[rb]) r[ra]++;
}

/**
 * Detects islands via Union-Find and trips units disconnected from the reference bus.
 * Complexity: O(m·α(n)) ≈ O(m) amortized, vs O(n·m) for the old flood-fill.
 */
export function detectIslands(state: SimState, onAlert?: AlertHandler) {
  const n = state.nsubs;
  ensureUF(n);
  const parent = _parent!, rank = _rank!;

  for (let i = 0; i < n; i++) { parent[i] = i; rank[i] = 0; }

  // Union connected substations via active branches
  for (const br of Object.values(state.branches)) {
    if (br.Status1 !== BranchStatus.IN && (br.Status2 !== BranchStatus.IN || br.Circuits === 1)) continue;
    ufUnion(br.fromIdx, br.toIdx);
  }

  // Find reference bus set (refIdx is pre-computed in initGrid)
  const refIdx = state.refIdx;
  if (refIdx < 0) {
    console.error(`Reference bus index not initialized (refIdx=${refIdx}).`);
    return;
  }
  const rootSet = ufFind(refIdx);

  // Mark islands and trip disconnected equipment
  for (const sub of Object.values(state.subs)) {
    const connected = ufFind(sub.idx) === rootSet;
    sub.island = connected ? ROOT_ISLAND : UNASSIGNED_ISLAND;
    if (connected) continue;

    for (let iu = 0; iu < sub.Units; ++iu) {
      const u = sub.U[iu];
      if (isUnitInactive(u.Status)) continue;
      u.Status = UnitStatus.TRIP;
      u.P = 0;
      u.Pset = 0;
      const type = sub.Category === SubstationCategory.Load ? "Load" : "Generator";
      onAlert?.({ message: `${type} ${sub.Name} #${iu + 1} tripped due to separation from grid`, critical: true });
    }
  }
}

function tripUnit(u: { Status: UnitStatus; P: number; Pset: number }) {
  u.Status = UnitStatus.TRIP;
  u.P = 0;
  u.Pset = 0;
}

/**
 * Handles probabilistic contingency analysis:
 * frequency-based and overload-based tripping.
 */
export function checkContingencies(state: SimState, onAlert?: AlertHandler) {
  const freq = state.frequency;
  let freqTrip = 0;
  if (freq < FREQ_TRIP_CRITICAL_LOW || freq > FREQ_TRIP_CRITICAL_HIGH) freqTrip = PROB_TRIP_FREQ_CRITICAL;
  else if (freq < FREQ_TRIP_HIGH_LOW || freq > FREQ_TRIP_HIGH_HIGH) freqTrip = PROB_TRIP_FREQ_HIGH;
  else if (freq < FREQ_TRIP_NORMAL_LOW || freq > FREQ_TRIP_NORMAL_HIGH) freqTrip = PROB_TRIP_FREQ_NORMAL;

  if (freqTrip > 0) {
    for (const sub of Object.values(state.subs)) {
      for (let iu = 0; iu < sub.Units; ++iu) {
        if (Math.random() >= freqTrip) continue;
        const u = sub.U[iu];
        if (isUnitInactive(u.Status)) continue;
        tripUnit(u);
        const type = sub.Category === SubstationCategory.Load ? "Load" : "Generator";
        onAlert?.({ message: `${type} ${sub.Name} #${iu + 1} tripped due to frequency`, critical: true });
      }
    }
  }

  // Overload-based tripping
  for (const br of Object.values(state.branches)) {
    const absP = Math.abs(br.P);
    const cap = br.Pmax * br.Circuits;
    let loadTrip = 0;
    if (absP > cap * OVERLOAD_TRIP_CRITICAL_MULTIPLIER) loadTrip = PROB_TRIP_OVERLOAD_CRITICAL;
    else if (absP > cap * OVERLOAD_TRIP_NORMAL_MULTIPLIER) loadTrip = PROB_TRIP_OVERLOAD_NORMAL;

    if (loadTrip === 0 || Math.random() >= loadTrip) continue;
    if (br.Status1 !== BranchStatus.IN && br.Status2 !== BranchStatus.IN) continue;

    br.Status1 = BranchStatus.TRIP;
    br.Status2 = BranchStatus.TRIP;
    onAlert?.({ message: `Branch ${br.sub1?.Name}-${br.sub2?.Name} tripped on overloading!`, critical: true });
    state.Ybus = null;
  }
}

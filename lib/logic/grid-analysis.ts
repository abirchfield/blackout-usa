import { SimulationState, GameState, BranchStatus, UnitStatus, SubstationCategory, AlertHandler } from "../types";
import { PhysicsConfig } from "../config";

// --- Topology Constants ---
const ROOT_BUS_NAME = "Bryan";
const ROOT_ISLAND_ID = 0;
const UNASSIGNED_ISLAND_ID = -1;

// --- Frequency Tripping Constants (from PhysicsConfig) ---
const FREQ_TRIP_CRITICAL_LOW = PhysicsConfig.FREQ_TRIP_CRITICAL_LOW;
const FREQ_TRIP_CRITICAL_HIGH = PhysicsConfig.FREQ_TRIP_CRITICAL_HIGH;
const PROB_TRIP_FREQ_CRITICAL = PhysicsConfig.PROB_TRIP_FREQ_CRITICAL;
const FREQ_TRIP_HIGH_LOW = PhysicsConfig.FREQ_TRIP_HIGH_LOW;
const FREQ_TRIP_HIGH_HIGH = PhysicsConfig.FREQ_TRIP_HIGH_HIGH;
const PROB_TRIP_FREQ_HIGH = PhysicsConfig.PROB_TRIP_FREQ_HIGH;
const FREQ_TRIP_NORMAL_LOW = PhysicsConfig.FREQ_TRIP_NORMAL_LOW;
const FREQ_TRIP_NORMAL_HIGH = PhysicsConfig.FREQ_TRIP_NORMAL_HIGH;
const PROB_TRIP_FREQ_NORMAL = PhysicsConfig.PROB_TRIP_FREQ_NORMAL;

// --- Overload Tripping Constants (from PhysicsConfig) ---
const OVERLOAD_TRIP_CRITICAL_MULTIPLIER = PhysicsConfig.OVERLOAD_TRIP_CRITICAL_MULTIPLIER;
const PROB_TRIP_OVERLOAD_CRITICAL = PhysicsConfig.PROB_TRIP_OVERLOAD_CRITICAL;
const OVERLOAD_TRIP_NORMAL_MULTIPLIER = PhysicsConfig.OVERLOAD_TRIP_NORMAL_MULTIPLIER;
const PROB_TRIP_OVERLOAD_NORMAL = PhysicsConfig.PROB_TRIP_OVERLOAD_NORMAL;

/**
 * Detects islands in the grid and trips units disconnected from the root bus.
 * Uses iterative flood-fill from the "Bryan" root bus.
 */
export function updateGridTopology(state: SimulationState, onAlert?: AlertHandler) {
  let rootFound = false;
  for (const key in state.subs) {
    const sub = state.subs[key];
    sub.island = UNASSIGNED_ISLAND_ID;
    if (sub.Name === ROOT_BUS_NAME) {
      sub.island = ROOT_ISLAND_ID;
      rootFound = true;
    }
  }

  if (!rootFound) {
    console.error(`Root bus "${ROOT_BUS_NAME}" not found in substations. Island detection will not work correctly.`);
    return;
  }

  const MAX_ITERATIONS = state.nsubs || Object.keys(state.subs).length;
  let iterations = 0;
  let changed_something = true;
  while (changed_something && iterations < MAX_ITERATIONS) {
    changed_something = false;
    iterations++;
    for (const key in state.branches) {
      const br = state.branches[key];
      if (br.Status1 !== BranchStatus.IN && (br.Status2 !== BranchStatus.IN || br.Circuits === 1)) continue;
      if (br.sub1?.island !== br.sub2?.island && br.sub1 && br.sub2) {
        if (br.sub1.island === ROOT_ISLAND_ID || br.sub2.island === ROOT_ISLAND_ID) {
          br.sub1.island = ROOT_ISLAND_ID;
          br.sub2.island = ROOT_ISLAND_ID;
          changed_something = true;
        }
      }
    }
  }

  // Trip anything not connected to the root
  for (const key in state.subs) {
    const sub = state.subs[key];
    if (sub.island === UNASSIGNED_ISLAND_ID) {
      for (let iu = 0; iu < sub.Units; ++iu) {
        const u = sub.U[iu];
        if (u.Status === UnitStatus.IN || u.Status === UnitStatus.SHUTDOWN || u.Status === UnitStatus.STARTUP) {
          u.Status = UnitStatus.TRIP;
          u.P = 0;
          u.Pset = 0;
          const type = sub.Category === SubstationCategory.Load ? "Load" : "Generator";
          onAlert?.({ message: `${type} ${sub.Name} #${iu + 1} tripped due to separation from grid`, critical: true });
        }
      }
    }
  }
}

/**
 * Handles probabilistic N-1 contingency analysis:
 * frequency-based and overload-based tripping.
 */
export function handleContingencies(state: GameState, onAlert?: AlertHandler) {
  // Frequency-based tripping
  const freq = state.frequency;
  let freq_prob_trip = 0;
  if (freq < FREQ_TRIP_CRITICAL_LOW || freq > FREQ_TRIP_CRITICAL_HIGH) freq_prob_trip = PROB_TRIP_FREQ_CRITICAL;
  else if (freq < FREQ_TRIP_HIGH_LOW || freq > FREQ_TRIP_HIGH_HIGH) freq_prob_trip = PROB_TRIP_FREQ_HIGH;
  else if (freq < FREQ_TRIP_NORMAL_LOW || freq > FREQ_TRIP_NORMAL_HIGH) freq_prob_trip = PROB_TRIP_FREQ_NORMAL;

  if (freq_prob_trip > 0) {
    for (const key in state.subs) {
      const sub = state.subs[key];
      for (let iu = 0; iu < sub.Units; ++iu) {
        if (Math.random() < freq_prob_trip) {
          const u = sub.U[iu];
          if (u.Status === UnitStatus.IN || u.Status === UnitStatus.STARTUP || u.Status === UnitStatus.SHUTDOWN) {
            u.Status = UnitStatus.TRIP;
            u.P = 0;
            u.Pset = 0;
            onAlert?.({ message: `${sub.Category === SubstationCategory.Load ? "Load" : "Generator"} ${sub.Name} #${iu + 1} tripped due to frequency`, critical: true });
            state.Ybus = null;
          }
        }
      }
    }
  }

  // Overload-based tripping
  for (const key in state.branches) {
    const br = state.branches[key];
    let overload_prob_trip = 0;
    if (Math.abs(br.P) > br.Pmax * br.Circuits * OVERLOAD_TRIP_CRITICAL_MULTIPLIER) overload_prob_trip = PROB_TRIP_OVERLOAD_CRITICAL;
    else if (Math.abs(br.P) > br.Pmax * br.Circuits * OVERLOAD_TRIP_NORMAL_MULTIPLIER) overload_prob_trip = PROB_TRIP_OVERLOAD_NORMAL;

    if (Math.random() < overload_prob_trip) {
      if (br.Status1 === BranchStatus.IN || br.Status2 === BranchStatus.IN) {
        br.Status1 = BranchStatus.TRIP;
        br.Status2 = BranchStatus.TRIP;
        onAlert?.({ message: `Branch ${br.sub1?.Name}-${br.sub2?.Name} tripped on overloading!`, critical: true });
        state.Ybus = null;
      }
    }
  }
}

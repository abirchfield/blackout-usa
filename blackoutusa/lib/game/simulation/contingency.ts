import { GameState, UnitStatus, BranchStatus, SubstationCategory, AlertHandler } from "../types";

// --- Frequency Tripping Constants ---
const FREQ_TRIP_CRITICAL_LOW = 57;
const FREQ_TRIP_CRITICAL_HIGH = 63;
const PROB_TRIP_FREQ_CRITICAL = 0.05;
const FREQ_TRIP_HIGH_LOW = 59;
const FREQ_TRIP_HIGH_HIGH = 61;
const PROB_TRIP_FREQ_HIGH = 0.01;
const FREQ_TRIP_NORMAL_LOW = 59.3;
const FREQ_TRIP_NORMAL_HIGH = 60.7;
const PROB_TRIP_FREQ_NORMAL = 0.001;

// --- Overload Tripping Constants ---
const OVERLOAD_TRIP_CRITICAL_MULTIPLIER = 1.5;
const PROB_TRIP_OVERLOAD_CRITICAL = 0.05;
const OVERLOAD_TRIP_NORMAL_MULTIPLIER = 1.2;
const PROB_TRIP_OVERLOAD_NORMAL = 0.01;

export class ContingencyManager {
  public handleContingencies(state: GameState, onAlert?: AlertHandler) {
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
}

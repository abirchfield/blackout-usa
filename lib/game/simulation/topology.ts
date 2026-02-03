import { SimulationState, BranchStatus, UnitStatus, SubstationCategory, AlertHandler } from "../types";

const ROOT_BUS_NAME = "Bryan";
const ROOT_ISLAND_ID = 0;
const UNASSIGNED_ISLAND_ID = -1;

export class TopologyAnalyzer {
  public updateGridTopology(state: SimulationState, onAlert?: AlertHandler) {
    // Check for connected topology
    for (const key in state.subs) {
        const sub = state.subs[key];
        sub.island = UNASSIGNED_ISLAND_ID;
        if (sub.Name === ROOT_BUS_NAME) sub.island = ROOT_ISLAND_ID;
    }

    let changed_something = true;
    while (changed_something) {
        changed_something = false;
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
}
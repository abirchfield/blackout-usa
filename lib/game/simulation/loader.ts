import { GameState, SubstationCategory, BranchStatus } from "../types";
import { scenario_data } from "../scenario/scenario_data";
import { PhysicsConfig } from "../config";

const BASE_FREQUENCY = PhysicsConfig.BASE_FREQUENCY;

export class GridLoader {
    public static loadInitialData(state: GameState) {
        state.subs = JSON.parse(JSON.stringify(scenario_data.subs));
        state.branches = JSON.parse(JSON.stringify(scenario_data.branches));
        state.borders = scenario_data.borders;
        state.nsubs = scenario_data.nsubs;

        for (const key in state.branches) {
            const branch = state.branches[key];
            branch.Number = key;
            branch.sub1 = state.subs[branch.FromNum];
            branch.sub2 = state.subs[branch.ToNum];

            if (branch.sub1 && branch.sub2) {
                branch.dist = Math.hypot(branch.sub1.Latitude - branch.sub2.Latitude, branch.sub1.Longitude - branch.sub2.Longitude);
            }
        }
        GridLoader.resetToDefaults(state);
    }

    public static resetToDefaults(state: GameState) {
        for (const key in state.subs) {
            const sub = state.subs[key];
            for (let iu = 0; iu < sub.Units; ++iu) {
                const u = sub.U[iu];
                u.Status = u.Status0;
                u.P = u.Pset = u.P0;
                u.StatusCount = 0;
                if (sub.Category === SubstationCategory.Solar || sub.Category === SubstationCategory.Wind) {
                    u.Pset = sub.Pmax / sub.Units;
                }
            }
        }
        for (const key in state.branches) {
            const br = state.branches[key];
            br.P = 0;
            br.Status1 = BranchStatus.IN;
            br.Status2 = BranchStatus.IN;
        }
        
        state.t = 0;
        state.Ybus = null;
        state.Yinv = null;
        state.frequency = BASE_FREQUENCY;
        state.fr_load = 1;
        state.fr_wind = 1;
        state.fr_solar = 1;

        state.metrics = {
            loadServed: 0,
            loadUnserved: 0,
            windGen: 0,
            reservesWind: 0,
            reservesSolar: 0,
            reservesThermal: 0,
            reservesNuclear: 0,
            solarGen: 0,
            thermalGen: 0,
            nuclearGen: 0,
            reserves: 0,
            currentFuelCost: 0,
            currentOpCost: 0,
            currentUnservedCost: 0,
            totalFuelCost: 0,
            totalOpCost: 0,
            totalUnservedCost: 0,
            totalCost: 0,
            avgCost: 0,
            totalMwh: 0,
        };
    }
}

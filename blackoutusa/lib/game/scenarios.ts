import { GameState, AlertHandler, STATUS_TRIP, STATUS_SHUTDOWN, STATUS_IN, STATUS_DIS } from "./types";

export interface IScenario {
    readonly day: number;
    start(state: GameState, onAlert: AlertHandler | undefined): void;
    update(state: GameState, onAlert: AlertHandler | undefined): void;
}

class Day1Scenario implements IScenario {
    readonly day = 1;

    start(state: GameState, onAlert: AlertHandler | undefined): void {
        state.fr_load = 0.83;
        state.fr_wind = 0.48;
        state.fr_solar = 1.00;
        onAlert?.({ message: "Your shift has started. Click \"View all Alerts\" to see additional hints for what to do.", critical: false }, true);
        onAlert?.({ message: "Hint #1: The McCamey Solar PV plant in West Texas is currently disconnected. You might as well start up all 3 units at that plant to get more, low-cost energy.", critical: false });
        onAlert?.({ message: "Hint #2: The Mission Gas Turbine plant in South Texas has very high costs. Try shutting down 1-3 of these units while you still have plenty of reserves.", critical: false });
        onAlert?.({ message: "Hint #3: You are going to need more reserves in the evening once the solar has gone down and the load is higher.", critical: false });
        onAlert?.({ message: "Hint #4: For the rest of the day, watch the reserves carefully. If they get below 500 MW you need to find new generation to start up.", critical: false });
    }

    update(state: GameState, onAlert: AlertHandler | undefined): void {
        if (state.t < 360) state.fr_load = 0.83 + 0.0002777 * state.t;
        else state.fr_load = 0.93 - 0.0008333 * (state.t - 360);
        if (state.t >= 240) state.fr_solar = Math.max(0, 1 - (state.t - 240) / 120);
        if (state.fr_wind < .53 && state.fr_wind > .43) {
            if (Math.random() < .25) state.fr_wind += 0.0001;
            else if (Math.random() < 0.333) state.fr_wind -= 0.0001;
        }
    }
}

class Day2Scenario implements IScenario {
    readonly day = 2;

    start(state: GameState, onAlert: AlertHandler | undefined): void {
        state.fr_load = 0.83;
        state.fr_wind = 0.48;
        state.fr_solar = 1.00;
        onAlert?.({ message: "Hint for Day 2: Watch the East-West lines. If they turn yellow or orange start shutting down western generation", critical: false }, true);
    }

    update(state: GameState, onAlert: AlertHandler | undefined): void {
        if (state.t < 360) state.fr_load = 0.83 + 0.0002777 * state.t;
        else state.fr_load = 0.93 - 0.0008333 * (state.t - 360);
        if (state.t >= 240) state.fr_solar = Math.max(0, 1 - (state.t - 240) / 120);
        if (state.t < 180) state.fr_wind = 0.48 + 0.0028 * state.t;
        
        if (state.t === 90) {
            state.branches["26"].Status1 = STATUS_TRIP;
            state.branches["26"].Status2 = STATUS_TRIP;
            onAlert?.({ message: `Maintenance requires tripping both Abiline - Ft Worth lines`, critical: false });
            state.Ybus = null;
        }
    }
}

class Day3Scenario implements IScenario {
    readonly day = 3;

    start(state: GameState, onAlert: AlertHandler | undefined): void {
        state.fr_load = 0.83;
        state.fr_wind = 0.48;
        state.fr_solar = 1.00;
        onAlert?.({ message: "No hints for Day 3: You can do this!", critical: false }, true);
    }

    update(state: GameState, onAlert: AlertHandler | undefined): void {
        if (state.t < 360) state.fr_load = 0.83 + 0.0002777 * state.t;
        else state.fr_load = 0.93 - 0.0008333 * (state.t - 360);
        if (state.t >= 240) state.fr_solar = Math.max(0, 1 - (state.t - 240) / 120);
        if (state.t < 180) state.fr_wind = 0.48 + 0.0028 * state.t;

        if (state.t > 240) {
            const tbranches = ["1", "2", "3", "4", "26", "27"];
            for (let i = 0; i < tbranches.length; ++i) {
                if (Math.random() < 0.05) {
                    const br = state.branches[tbranches[i]];
                    if (br.Status1 === STATUS_TRIP) continue;
                    br.Status1 = STATUS_TRIP;
                    br.Status2 = STATUS_TRIP;
                    onAlert?.({ message: `${br.sub1?.Name}-${br.sub2?.Name} transmission line trips due to tornado`, critical: true });
                    state.Ybus = null;
                }
            }
        }
        if (state.t === 30) {
            state.subs["31"].U[0].Status = STATUS_SHUTDOWN;
            onAlert?.({ message: `Scheduled shutdown of Wadsworth Unit #1 begins`, critical: false });
        }
    }
}

class Day4Scenario implements IScenario {
    readonly day = 4;

    start(state: GameState, onAlert: AlertHandler | undefined): void {
        state.fr_load = 0.83;
        state.fr_wind = 0.48;
        state.fr_solar = 1.00;
        onAlert?.({ message: "Hint for Day 4: Things can happen really fast when there is rapid loss of generation. Stay vigilent!", critical: false }, true);
    }

    update(state: GameState, onAlert: AlertHandler | undefined): void {
        if (state.t < 360) state.fr_load = 0.83 + 0.0002777 * state.t;
        else state.fr_load = 0.93 - 0.0008333 * (state.t - 360);
        if (state.t >= 240) state.fr_solar = Math.max(0, 1 - (state.t - 240) / 120);
        if (state.t < 180) state.fr_wind = 0.48 + 0.0028 * state.t;

        const outages = [[90, "2", 3], [120, "2", 4], [75, "2", 1], [350, "2", 0], [410, "2", 1], [190, "24", 3], [220, "24", 4], [375, "24", 1], [50, "24", 0], [210, "24", 1], [400, "31", 1], [300, "4", 0], [300, "4", 1],[300, "4", 2],[300, "4", 3], [250, "26", 1], [290, "28", 0], [330, "20", 0], [335, "20", 1], [340, "20", 2], [360, "20", 3], [390, "20", 4], [100, "21", 2], [150, "21", 1], [180, "21", 0]];
        for (const outage of outages) {
            if (state.t === outage[0]) {
                const sub = state.subs[outage[1] as string];
                const u = sub.U[outage[2] as number];
                u.Status = STATUS_TRIP;
                onAlert?.({ message: `${sub.Name} unit #${(outage[2] as number) + 1} trips due to cold weather`, critical: true });
            }
        }
    }
}

class Day5Scenario implements IScenario {
    readonly day = 5;

    start(state: GameState, onAlert: AlertHandler | undefined): void {
        state.fr_load = 0.83;
        state.fr_wind = 0.48;
        state.fr_solar = 1.00;
        
        let i;
        for (i=0;i<5;++i) state.subs["2"].U[i].Status = STATUS_TRIP; 
        for (i=0;i<3;++i) state.subs["5"].U[i].Status = STATUS_TRIP; 
        for (i=0;i<4;++i) state.subs["8"].U[i].Status = STATUS_TRIP; 
        for (i=0;i<8;++i) state.subs["10"].U[i].Status = STATUS_DIS; 
        for (i=0;i<4;++i) state.subs["14"].U[i].Status = STATUS_TRIP; 
        for (i=0;i<8;++i) state.subs["15"].U[i].Status = STATUS_TRIP; 
        for (i=2;i<5;++i) state.subs["16"].U[i].Status = STATUS_TRIP; 
        for (i=1;i<4;++i) state.subs["21"].U[i].Status = STATUS_TRIP; 
        for (i=0;i<4;++i) state.subs["25"].U[i].Status = STATUS_TRIP; 
        for (i=0;i<2;++i) state.subs["31"].U[i].Status = STATUS_TRIP; 
        state.branches["5"].Status1 = STATUS_TRIP;
        state.branches["10"].Status1 = STATUS_TRIP;
        state.branches["11"].Status1 = STATUS_TRIP;
        state.branches["15"].Status1 = STATUS_TRIP;
        state.branches["16"].Status1 = STATUS_TRIP;
        state.branches["20"].Status1 = STATUS_TRIP;
        state.branches["21"].Status1 = STATUS_TRIP;
        state.branches["29"].Status1 = STATUS_TRIP;
        state.branches["30"].Status1 = STATUS_TRIP;
        state.branches["31"].Status1 = STATUS_TRIP;
        state.branches["32"].Status1 = STATUS_TRIP;
        state.branches["32"].Status2 = STATUS_TRIP;
        state.branches["33"].Status1 = STATUS_TRIP; 
        state.branches["35"].Status1 = STATUS_TRIP;
        state.branches["35"].Status2 = STATUS_TRIP;
        state.branches["36"].Status1 = STATUS_TRIP; 
        state.branches["36"].Status2 = STATUS_TRIP;
        state.branches["43"].Status1 = STATUS_TRIP;
        state.branches["44"].Status1 = STATUS_TRIP;
        state.branches["50"].Status1 = STATUS_TRIP;
        state.branches["59"].Status1 = STATUS_TRIP;
        state.branches["59"].Status2 = STATUS_TRIP;
        state.branches["60"].Status1 = STATUS_TRIP;
        for (i=0;i<2;++i) state.subs["26"].U[i].P = 290; 
        for (i=0;i<3;++i) state.subs["19"].U[i].Status = STATUS_IN; 
        
        onAlert?.({ message: "Hint for Day 5: Keep checking the coastal substations and lines to see if anything new has become ready for restoration", critical: false }, true);
    }

    update(state: GameState, onAlert: AlertHandler | undefined): void {
        if (state.t < 360) state.fr_load = 0.83 + 0.0002777 * state.t;
        else state.fr_load = 0.93 - 0.0008333 * (state.t - 360);
        if (state.t >= 240) state.fr_solar = Math.max(0, 1 - (state.t - 240) / 120);
        if (state.t < 180) state.fr_wind = 0.48 + 0.0028 * state.t;

        const restorations: [number, string, string][] = [
            [30, "15", 'all-u-3'], [50, "35", 'b2'], [70, "8", 'all'], [90, "33", 'b1'], [110, "59", 'b1'], [130, "5", 'all'], [150, "5", 'b1'], [170, "43", 'b1'], [190, "25", 'all-u-2'], [200, "15", 'all-u-8-from-3'], [230, "16", 'all-u-5-from-2'], [250, "10", 'b1'], [270, "25", 'all-u-4-from-2'], [300, "21", 'all-u-4-from-1'], [360, "14", 'all-u-2'], [390, "30", 'b1'], [420, "2", 'all-u-5-from-3'], [430, "14", 'all-u-4-from-2'], [440, "15", 'b1'], [450, "20", 'b1'], [460, "16", 'b1'], [490, "29", 'b1'], [500, "50", 'b1'], [520, "21", 'b1'], [540, "36", 'b1'],
        ];
        restorations.forEach(([time, id, target]) => {
            if (state.t === time) {
                if (typeof target === 'string' && target.startsWith('b')) { // Branch
                    const br = state.branches[id];
                    if (target === 'b1' && br.Status1 === STATUS_TRIP) br.Status1 = STATUS_DIS;
                    if (target === 'b2' && br.Status2 === STATUS_TRIP) br.Status2 = STATUS_DIS;
                } else { // Substation units
                    const sub = state.subs[id];
                    if (target === 'all') sub.U.forEach(u => { if(u.Status === STATUS_TRIP) u.Status = STATUS_DIS });
                    else if (typeof target === 'string' && target.includes('-u-')) {
                        const parts = target.split('-u-');
                        const count = parseInt(parts[1]);
                        let startIdx = 0;
                        if (target.includes('-from-')) {
                            startIdx = parseInt(target.split('-from-')[1]);
                        }
                        for (let i = startIdx; i < (startIdx + count); i++) if(sub.U[i]?.Status === STATUS_TRIP) sub.U[i].Status = STATUS_DIS;
                    }
                }
            }
        });
    }
}

export const scenarios: Record<number, IScenario> = {
    1: new Day1Scenario(),
    2: new Day2Scenario(),
    3: new Day3Scenario(),
    4: new Day4Scenario(),
    5: new Day5Scenario(),
};
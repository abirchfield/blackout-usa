import { SimulationState, AlertHandler, HintHandler, Briefing, UnitStatus, BranchStatus, IScenario, ResultDetails } from "@/lib/types";
import { evaluateResults } from "@/lib/utils";

// --- Shared Weather Helpers ---

function initWeather(state: SimulationState) {
    state.fr_load = 0.83;
    state.fr_wind = 0.48;
    state.fr_solar = 1.00;
}

function updateLoadCurve(state: SimulationState) {
    if (state.t < 360) state.fr_load = 0.83 + 0.0002777 * state.t;
    else state.fr_load = 0.93 - 0.0008333 * (state.t - 360);
}

function updateSolarFadeout(state: SimulationState) {
    if (state.t >= 240) state.fr_solar = Math.max(0, 1 - (state.t - 240) / 120);
}

function updateWindRamp(state: SimulationState) {
    if (state.t < 180) state.fr_wind = 0.48 + 0.0028 * state.t;
}

// --- Scenario Data ---

const HURRICANE_RESTORATIONS: [number, string, string][] = [
    [30, "15", 'all-u-3'], [50, "35", 'b2'], [70, "8", 'all'], [90, "33", 'b1'], [110, "59", 'b1'], [130, "5", 'all'], [150, "5", 'b1'], [170, "43", 'b1'], [190, "25", 'all-u-2'], [200, "15", 'all-u-8-from-3'], [230, "16", 'all-u-5-from-2'], [250, "10", 'b1'], [270, "25", 'all-u-4-from-2'], [300, "21", 'all-u-4-from-1'], [360, "14", 'all-u-2'], [390, "30", 'b1'], [420, "2", 'all-u-5-from-3'], [430, "14", 'all-u-4-from-2'], [440, "15", 'b1'], [450, "20", 'b1'], [460, "16", 'b1'], [490, "29", 'b1'], [500, "50", 'b1'], [520, "21", 'b1'], [540, "36", 'b1'],
];

class Day1Scenario implements IScenario {
    readonly day = 1;
    readonly briefing: Briefing = {
        title: "Day 1 Briefing",
        isList: true,
        points: [
            "Your goal is to avoid a blackout and keep operating costs as low as possible.",
            "Your shift runs from 1pm to 11pm.",
            "Load (electrical demand from customers) is expected to rise, peak around 7pm, and then decline later in the night.",
            "There is a steady, moderate wind predicted for the whole afternoon and evening.",
            "Keep in mind the solar generation will go down later in the afternoon!",
        ]
    };

    start(state: SimulationState, onAlert: AlertHandler | undefined, onHint: HintHandler | undefined): void {
        initWeather(state);
        onHint?.({ message: "The McCamey Solar PV plant in West Texas is currently disconnected. You might as well start up all 3 units at that plant to get more, low-cost energy." });
        onHint?.({ message: "The Mission Gas Turbine plant in South Texas has very high costs. Try shutting down 1-3 of these units while you still have plenty of reserves." });
        onHint?.({ message: "You are going to need more reserves in the evening once the solar has gone down and the load is higher." });
        onHint?.({ message: "For the rest of the day, watch the reserves carefully. If they get below 500 MW you need to find new generation to start up." });
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    update(state: SimulationState, _onAlert: AlertHandler | undefined, _onHint: HintHandler | undefined): void {
        updateLoadCurve(state);
        updateSolarFadeout(state);
        if (state.fr_wind < .53 && state.fr_wind > .43) {
            if (Math.random() < .25) state.fr_wind += 0.0001;
            else if (Math.random() < 0.333) state.fr_wind -= 0.0001;
        }
    }

    getResultDetails(totalCost: number): ResultDetails {
        return evaluateResults(totalCost, 1.65, 2.0, 10.0);
    }
}

class Day2Scenario implements IScenario {
    readonly day = 2;

    readonly briefing: Briefing = {
        title: "Day 2 Briefing",
        isList: true,
        points: [
            "Your goal is to avoid a blackout and keep operating costs as low as possible.",
            "Wind availability will rise steadily this afternoon, up to nearly 100% by 4pm and remain high for the rest of your shift.",
            "Other conditions are the same as yesterday.",
            "Unfortunately, at 2:30 PM both transmission lines from Abilene to Ft Worth will need to be taken offline due to some unavoidable maintenance issues.",
            "Watch transmission line loading. If lines are overloaded 120% or more they may trip, triggering a cascade and blackout!",
        ]
    };

    start(state: SimulationState, onAlert: AlertHandler | undefined, onHint: HintHandler | undefined): void {
        initWeather(state);
        onHint?.({ message: "Watch the East-West lines. If they turn yellow or orange start shutting down western generation" }, true);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    update(state: SimulationState, onAlert: AlertHandler | undefined, _onHint: HintHandler | undefined): void {
        updateLoadCurve(state);
        updateSolarFadeout(state);
        updateWindRamp(state);

        if (state.t === 90) {
            state.branches["26"].Status1 = BranchStatus.TRIP;
            state.branches["26"].Status2 = BranchStatus.TRIP;
            onAlert?.({ message: `Maintenance requires tripping both Abilene - Ft Worth lines`, critical: false });
            state.Ybus = null;
        }
    }

    getResultDetails(totalCost: number): ResultDetails {
        return evaluateResults(totalCost, 1.41, 2.0, 10.0);
    }
}

class Day3Scenario implements IScenario {
    readonly day = 3;

    readonly briefing: Briefing = {
        title: "Day 3 Briefing",
        isList: true,
        points: [
            "Your goal is to avoid a blackout and keep operating costs as low as possible.",
            "Wind is expected to be high, as yesterday.",
            "Tornados are expected near Abilene around 5pm, and any nearby transmission lines are subject to tripping.",
            "In addition, a scheduled shutdown of Wadsworth Unit #1 begins at 1:30 PM.",
        ]
    };

    start(state: SimulationState, onAlert: AlertHandler | undefined, onHint: HintHandler | undefined): void {
        initWeather(state);
        onHint?.({ message: "No hints for Day 3: You can do this!" }, true);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    update(state: SimulationState, onAlert: AlertHandler | undefined, _onHint: HintHandler | undefined): void {
        updateLoadCurve(state);
        updateSolarFadeout(state);
        updateWindRamp(state);

        if (state.t > 240) {
            const tbranches = ["1", "2", "3", "4", "26", "27"];
            for (let i = 0; i < tbranches.length; ++i) {
                if (Math.random() < 0.05) {
                    const br = state.branches[tbranches[i]];
                    if (br.Status1 === BranchStatus.TRIP) continue;
                    br.Status1 = BranchStatus.TRIP;
                    br.Status2 = BranchStatus.TRIP;
                    onAlert?.({ message: `${br.sub1?.Name}-${br.sub2?.Name} transmission line trips due to tornado`, critical: true });
                    state.Ybus = null;
                }
            }
        }
        if (state.t === 30) {
            state.subs["31"].U[0].Status = UnitStatus.SHUTDOWN;
            onAlert?.({ message: `Scheduled shutdown of Wadsworth Unit #1 begins`, critical: false });
        }
    }

    getResultDetails(totalCost: number): ResultDetails {
        return evaluateResults(totalCost, 3.35, 5.0, 15.0);
    }
}

class Day4Scenario implements IScenario {
    readonly day = 4;

    readonly briefing: Briefing = {
        title: "Day 4 Briefing",
        isList: true,
        points: [
            "Your goal is to avoid a blackout and keep operating costs as low as possible.",
            "Generators will be tripping significantly due to cold weather.",
            "Intentional load shedding will be necessary to avoid frequency issues and blackout.",
        ]
    };

    start(state: SimulationState, onAlert: AlertHandler | undefined, onHint: HintHandler | undefined): void {
        initWeather(state);
        onHint?.({ message: "Things can happen really fast when there is rapid loss of generation. Stay vigilent!" }, true);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    update(state: SimulationState, onAlert: AlertHandler | undefined, _onHint: HintHandler | undefined): void {
        updateLoadCurve(state);
        updateSolarFadeout(state);
        updateWindRamp(state);

        const outages: [number, string, number][] = [[90, "2", 3], [120, "2", 4], [75, "2", 1], [350, "2", 0], [410, "2", 1], [190, "24", 3], [220, "24", 4], [375, "24", 1], [50, "24", 0], [210, "24", 1], [400, "31", 1], [300, "4", 0], [300, "4", 1],[300, "4", 2],[300, "4", 3], [250, "26", 1], [290, "28", 0], [330, "20", 0], [335, "20", 1], [340, "20", 2], [360, "20", 3], [390, "20", 4], [100, "21", 2], [150, "21", 1], [180, "21", 0]];
        for (const [time, subId, unitIdx] of outages) {
            if (state.t === time) {
                const sub = state.subs[subId];
                if (!sub || unitIdx >= sub.U.length) continue;
                const u = sub.U[unitIdx];
                u.Status = UnitStatus.TRIP;
                onAlert?.({ message: `${sub.Name} unit #${unitIdx + 1} trips due to cold weather`, critical: true });
            }
        }
    }

    getResultDetails(totalCost: number): ResultDetails {
        return evaluateResults(totalCost, 3.22, 8.0, 20.0);
    }
}

class Day5Scenario implements IScenario {
    readonly day = 5;

    readonly briefing: Briefing = {
        title: "Day 5 Briefing",
        isList: false,
        points: [
            "Ready for the last challenge? On Day 5, your shift starts after an extreme hurricane hit this morning. Many loads, lines, and generators along the gulf coast are tripped. Throughout the day, crews are working tirelessly to get these tripped elements ready for restoration. Your job is to get service restored to customers as quickly and safely as possible. Note that when a line or substation turns from red to white it is eligible to be restored."
        ]
    };

    private readonly restorations = HURRICANE_RESTORATIONS;


    start(state: SimulationState, onAlert: AlertHandler | undefined, onHint: HintHandler | undefined): void {
        initWeather(state);

        let i;
        for (i=0;i<5;++i) state.subs["2"].U[i].Status = UnitStatus.TRIP;
        for (i=0;i<3;++i) state.subs["5"].U[i].Status = UnitStatus.TRIP;
        for (i=0;i<4;++i) state.subs["8"].U[i].Status = UnitStatus.TRIP;
        for (i=0;i<8;++i) state.subs["10"].U[i].Status = UnitStatus.DIS;
        for (i=0;i<4;++i) state.subs["14"].U[i].Status = UnitStatus.TRIP;
        for (i=0;i<8;++i) state.subs["15"].U[i].Status = UnitStatus.TRIP;
        for (i=2;i<5;++i) state.subs["16"].U[i].Status = UnitStatus.TRIP;
        for (i=1;i<4;++i) state.subs["21"].U[i].Status = UnitStatus.TRIP;
        for (i=0;i<4;++i) state.subs["25"].U[i].Status = UnitStatus.TRIP;
        for (i=0;i<2;++i) state.subs["31"].U[i].Status = UnitStatus.TRIP;
        state.branches["5"].Status1 = BranchStatus.TRIP;
        state.branches["10"].Status1 = BranchStatus.TRIP;
        state.branches["11"].Status1 = BranchStatus.TRIP;
        state.branches["15"].Status1 = BranchStatus.TRIP;
        state.branches["16"].Status1 = BranchStatus.TRIP;
        state.branches["20"].Status1 = BranchStatus.TRIP;
        state.branches["21"].Status1 = BranchStatus.TRIP;
        state.branches["29"].Status1 = BranchStatus.TRIP;
        state.branches["30"].Status1 = BranchStatus.TRIP;
        state.branches["31"].Status1 = BranchStatus.TRIP;
        state.branches["32"].Status1 = BranchStatus.TRIP;
        state.branches["32"].Status2 = BranchStatus.TRIP;
        state.branches["33"].Status1 = BranchStatus.TRIP;
        state.branches["35"].Status1 = BranchStatus.TRIP;
        state.branches["35"].Status2 = BranchStatus.TRIP;
        state.branches["36"].Status1 = BranchStatus.TRIP;
        state.branches["36"].Status2 = BranchStatus.TRIP;
        state.branches["43"].Status1 = BranchStatus.TRIP;
        state.branches["44"].Status1 = BranchStatus.TRIP;
        state.branches["50"].Status1 = BranchStatus.TRIP;
        state.branches["59"].Status1 = BranchStatus.TRIP;
        state.branches["59"].Status2 = BranchStatus.TRIP;
        state.branches["60"].Status1 = BranchStatus.TRIP;
        for (i=0;i<2;++i) state.subs["26"].U[i].P = 290;
        for (i=0;i<3;++i) state.subs["19"].U[i].Status = UnitStatus.IN;

        onHint?.({ message: "Keep checking the coastal substations and lines to see if anything new has become ready for restoration" }, true);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    update(state: SimulationState, _onAlert: AlertHandler | undefined, _onHint: HintHandler | undefined): void {
        updateLoadCurve(state);
        updateSolarFadeout(state);
        updateWindRamp(state);

        this.restorations.forEach(([time, id, target]) => {
            if (state.t !== time) return;

            if (target.startsWith('b')) {
                // Branch restoration: 'b1' or 'b2'
                const br = state.branches[id];
                if (!br) return;
                if (target === 'b1' && br.Status1 === BranchStatus.TRIP) br.Status1 = BranchStatus.DIS;
                if (target === 'b2' && br.Status2 === BranchStatus.TRIP) br.Status2 = BranchStatus.DIS;
            } else {
                // Substation unit restoration: 'all', 'all-u-N', or 'all-u-N-from-M'
                const sub = state.subs[id];
                if (!sub) return;

                if (target === 'all') {
                    sub.U.forEach(u => { if (u.Status === UnitStatus.TRIP) u.Status = UnitStatus.DIS; });
                } else {
                    const countMatch = target.match(/^all-u-(\d+)/);
                    const fromMatch = target.match(/-from-(\d+)/);
                    if (!countMatch) return;
                    const count = parseInt(countMatch[1], 10);
                    const startIdx = fromMatch ? parseInt(fromMatch[1], 10) : 0;
                    const endIdx = Math.min(startIdx + count, sub.U.length);
                    for (let i = startIdx; i < endIdx; i++) {
                        if (sub.U[i].Status === UnitStatus.TRIP) sub.U[i].Status = UnitStatus.DIS;
                    }
                }
            }
        });
    }

    getResultDetails(totalCost: number): ResultDetails {
        return evaluateResults(totalCost, 12.90, 18.0, 30.0);
    }
}

export const scenarios: Record<number, IScenario> = {
    1: new Day1Scenario(),
    2: new Day2Scenario(),
    3: new Day3Scenario(),
    4: new Day4Scenario(),
    5: new Day5Scenario(),
};

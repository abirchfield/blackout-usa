import { IScenario } from "@/lib/types";
import {
    defineScenario, time,
    tripUnits, disableUnits, enableUnits, shutdownUnit,
    tripBranch, setUnitPower, randomBranchTrips,
    processTimedTrips, processTimedRestorations,
    TimedUnitTrip, TimedRestoration,
} from "@/data/scenario-helpers";
import { SUB, LINE } from "./lookups";

// ============================================================
// Day 1: The Baseline Day
// Load rises, wind steady, solar fades in the evening
// ============================================================

const day1 = defineScenario({
    day: 1,
    briefing: {
        title: "Day 1 Briefing",
        isList: true,
        points: [
            "Your goal is to avoid a blackout and keep operating costs as low as possible.",
            "Your shift runs from 1pm to 11pm.",
            "Load (electrical demand from customers) is expected to rise, peak around 7pm, and then decline later in the night.",
            "There is a steady, moderate wind predicted for the whole afternoon and evening.",
            "Keep in mind the solar generation will go down later in the afternoon!",
        ]
    },
    costs: { record: 1.65, good: 2.0, okay: 10.0 },
    weather: ['load', 'solar'],
    hints: [
        "The McCamey Solar PV plant in West Texas is currently disconnected. You might as well start up all 3 units at that plant to get more, low-cost energy.",
        "The Mission Gas Turbine plant in South Texas has very high costs. Try shutting down 1-3 of these units while you still have plenty of reserves.",
        "You are going to need more reserves in the evening once the solar has gone down and the load is higher.",
        "For the rest of the day, watch the reserves carefully. If they get below 500 MW you need to find new generation to start up.",
    ],

    update(state) {
        // Gentle wind drift around baseline
        if (state.frWind < .53 && state.frWind > .43) {
            if (Math.random() < .25) state.frWind += 0.0001;
            else if (Math.random() < 0.333) state.frWind -= 0.0001;
        }
    },
});

// ============================================================
// Day 2: Maintenance Constraint
// High wind coming, but Abilene-Ft Worth lines go down at 2:30 PM
// ============================================================

const day2 = defineScenario({
    day: 2,
    briefing: {
        title: "Day 2 Briefing",
        isList: true,
        points: [
            "Your goal is to avoid a blackout and keep operating costs as low as possible.",
            "Wind availability will rise steadily this afternoon, up to nearly 100% by 4pm and remain high for the rest of your shift.",
            "Other conditions are the same as yesterday.",
            "Unfortunately, at 2:30 PM both transmission lines from Abilene to Ft Worth will need to be taken offline due to some unavoidable maintenance issues.",
            "Watch transmission line loading. If lines are overloaded 120% or more they may trip, triggering a cascade and blackout!",
        ]
    },
    costs: { record: 1.41, good: 2.0, okay: 10.0 },
    weather: ['load', 'solar', 'wind'],
    hints: ["Watch the East-West lines. If they turn yellow or orange start shutting down western generation"],

    update(state, onAlert) {
        if (state.t === time(2, 30)) {
            tripBranch(state, LINE.FtWorth_Abilene, 'both');
            onAlert?.({ message: `Maintenance requires tripping both Abilene - Ft Worth lines`, critical: false });
        }
    },
});

// ============================================================
// Day 3: Tornado + Equipment Shutdown
// High wind, tornados near Abilene at 5pm, Wadsworth Unit #1 shuts down at 1:30 PM
// ============================================================

const TORNADO_BRANCHES = [
    LINE.Abilene_McCamey,
    LINE.Abilene_Odessa,
    LINE.Abilene_Snyder,
    LINE.Abilene_Waco,
    LINE.FtWorth_Abilene,
    LINE.FtWorth_Snyder,
];

const day3 = defineScenario({
    day: 3,
    briefing: {
        title: "Day 3 Briefing",
        isList: true,
        points: [
            "Your goal is to avoid a blackout and keep operating costs as low as possible.",
            "Wind is expected to be high, as yesterday.",
            "Tornados are expected near Abilene around 5pm, and any nearby transmission lines are subject to tripping.",
            "In addition, a scheduled shutdown of Wadsworth Unit #1 begins at 1:30 PM.",
        ]
    },
    costs: { record: 3.35, good: 5.0, okay: 15.0 },
    weather: ['load', 'solar', 'wind'],
    hints: ["No hints for Day 3: You can do this!"],

    update(state, onAlert) {
        // Tornado: after 5:00 PM, 5% chance each tick to trip Abilene-area branches
        if (state.t > time(5, 0)) {
            randomBranchTrips(state, TORNADO_BRANCHES, 0.05, onAlert, "due to tornado");
        }

        // Scheduled shutdown of Wadsworth Unit #1 at 1:30 PM
        if (state.t === time(1, 30)) {
            shutdownUnit(state, SUB.Wadsworth, 0);
            onAlert?.({ message: `Scheduled shutdown of Wadsworth Unit #1 begins`, critical: false });
        }
    },
});

// ============================================================
// Day 4: Generator Outages / Cold Weather
// Multiple generators trip throughout the day due to extreme cold
// ============================================================

const COLD_WEATHER_TRIPS: TimedUnitTrip[] = [
    // Armstrong Wind (5 units)
    { at: time(2, 15), sub: SUB.Armstrong, unit: 1 },
    { at: time(2, 30), sub: SUB.Armstrong, unit: 3 },
    { at: time(3, 0),  sub: SUB.Armstrong, unit: 4 },
    { at: time(6, 50), sub: SUB.Armstrong, unit: 0 },
    { at: time(7, 50), sub: SUB.Armstrong, unit: 1 },
    // O'Donnell Wind (6 units)
    { at: time(1, 50), sub: SUB.ODonnell, unit: 0 },
    { at: time(4, 10), sub: SUB.ODonnell, unit: 3 },
    { at: time(4, 30), sub: SUB.ODonnell, unit: 1 },
    { at: time(4, 40), sub: SUB.ODonnell, unit: 4 },
    { at: time(7, 15), sub: SUB.ODonnell, unit: 1 },
    // Wadsworth Nuclear (2 units)
    { at: time(7, 40), sub: SUB.Wadsworth, unit: 1 },
    // Bastrop Solar (4 units) — all at 6:00 PM
    { at: time(6, 0),  sub: SUB.Bastrop, unit: 0 },
    { at: time(6, 0),  sub: SUB.Bastrop, unit: 1 },
    { at: time(6, 0),  sub: SUB.Bastrop, unit: 2 },
    { at: time(6, 0),  sub: SUB.Bastrop, unit: 3 },
    // Rockdale Coal (2 units)
    { at: time(5, 10), sub: SUB.Rockdale, unit: 1 },
    // Snyder Gas Turbine (2 units)
    { at: time(5, 50), sub: SUB.Snyder, unit: 0 },
    // McKinney Gas CC (5 units)
    { at: time(6, 30), sub: SUB.McKinney, unit: 0 },
    { at: time(6, 35), sub: SUB.McKinney, unit: 1 },
    { at: time(6, 40), sub: SUB.McKinney, unit: 2 },
    { at: time(7, 0),  sub: SUB.McKinney, unit: 3 },
    { at: time(7, 30), sub: SUB.McKinney, unit: 4 },
    // Mission Gas Turbine (4 units)
    { at: time(2, 40), sub: SUB.Mission, unit: 2 },
    { at: time(3, 30), sub: SUB.Mission, unit: 1 },
    { at: time(4, 0),  sub: SUB.Mission, unit: 0 },
];

const day4 = defineScenario({
    day: 4,
    briefing: {
        title: "Day 4 Briefing",
        isList: true,
        points: [
            "Your goal is to avoid a blackout and keep operating costs as low as possible.",
            "Generators will be tripping significantly due to cold weather.",
            "Intentional load shedding will be necessary to avoid frequency issues and blackout.",
        ]
    },
    costs: { record: 3.22, good: 8.0, okay: 20.0 },
    weather: ['load', 'solar', 'wind'],
    hints: ["Things can happen really fast when there is rapid loss of generation. Stay vigilent!"],

    update(state, onAlert) {
        processTimedTrips(state, COLD_WEATHER_TRIPS, onAlert,
            (subName, unitIdx) => `${subName} unit #${unitIdx + 1} trips due to cold weather`);
    },
});

// ============================================================
// Day 5: Hurricane Restoration
// Post-hurricane with massive damage, crews restoring throughout the day
// ============================================================

const HURRICANE_RESTORATIONS: TimedRestoration[] = [
    // 1:30 PM — Houston loads begin coming back (first 3 units)
    { at: time(1, 30), sub: SUB.Houston,       units: { count: 3 } },
    // 1:50 PM — Katy-Houston line circuit 2 ready
    { at: time(1, 50), branch: LINE.Katy_Houston,          circuit: 2 },
    // 2:10 PM — All Corpus Christi loads ready
    { at: time(2, 10), sub: SUB.CorpusChristi },
    // 2:30 PM — Houston-Pasadena line ready
    { at: time(2, 30), branch: LINE.Houston_Pasadena,       circuit: 1 },
    // 2:50 PM — Wadsworth-El Campo line ready
    { at: time(2, 50), branch: LINE.Wadsworth_ElCampo,      circuit: 1 },
    // 3:10 PM — All Brownsville loads ready
    { at: time(3, 10), sub: SUB.Brownsville },
    // 3:30 PM — Armstrong-Corpus Christi line ready
    { at: time(3, 30), branch: LINE.Armstrong_CorpusChristi, circuit: 1 },
    // 3:50 PM — Mission-Brownsville line ready
    { at: time(3, 50), branch: LINE.Mission_Brownsville,    circuit: 1 },
    // 4:10 PM — Pasadena first 2 units ready
    { at: time(4, 10), sub: SUB.Pasadena,      units: { count: 2 } },
    // 4:20 PM — Houston units 3-7 ready
    { at: time(4, 20), sub: SUB.Houston,        units: { from: 3, count: 8 } },
    // 4:50 PM — Katy units 2-4 ready
    { at: time(4, 50), sub: SUB.Katy,           units: { from: 2, count: 5 } },
    // 5:10 PM — Brownsville-Armstrong line ready
    { at: time(5, 10), branch: LINE.Brownsville_Armstrong,  circuit: 1 },
    // 5:30 PM — Pasadena units 2-3 ready
    { at: time(5, 30), sub: SUB.Pasadena,       units: { from: 2, count: 4 } },
    // 6:00 PM — Mission units 1-3 ready
    { at: time(6, 0),  sub: SUB.Mission,        units: { from: 1, count: 4 } },
    // 7:00 PM — Galveston first 2 units ready
    { at: time(7, 0),  sub: SUB.Galveston,      units: { count: 2 } },
    // 7:30 PM — Galveston-Pasadena line ready
    { at: time(7, 30), branch: LINE.Galveston_Pasadena,     circuit: 1 },
    // 8:00 PM — Armstrong units 3-4 ready
    { at: time(8, 0),  sub: SUB.Armstrong,      units: { from: 3, count: 5 } },
    // 8:10 PM — Galveston units 2-3 ready
    { at: time(8, 10), sub: SUB.Galveston,      units: { from: 2, count: 4 } },
    // 8:20 PM — Corpus Christi-El Campo line ready
    { at: time(8, 20), branch: LINE.CorpusChristi_ElCampo,  circuit: 1 },
    // 8:30 PM — El Campo-Katy line ready
    { at: time(8, 30), branch: LINE.ElCampo_Katy,           circuit: 1 },
    // 8:40 PM — Corpus Christi-Wadsworth line ready
    { at: time(8, 40), branch: LINE.CorpusChristi_Wadsworth, circuit: 1 },
    // 9:10 PM — Galveston-Katy line ready
    { at: time(9, 10), branch: LINE.Galveston_Katy,         circuit: 1 },
    // 9:20 PM — Pasadena-College Station line ready
    { at: time(9, 20), branch: LINE.Pasadena_CollegeStation, circuit: 1 },
    // 9:40 PM — El Campo-San Antonio line ready
    { at: time(9, 40), branch: LINE.ElCampo_SanAntonio,     circuit: 1 },
    // 10:00 PM — Katy-Rockdale line ready
    { at: time(10, 0), branch: LINE.Katy_Rockdale,          circuit: 1 },
];

const day5 = defineScenario({
    day: 5,
    briefing: {
        title: "Day 5 Briefing",
        isList: false,
        points: [
            "Ready for the last challenge? On Day 5, your shift starts after an extreme hurricane hit this morning. Many loads, lines, and generators along the gulf coast are tripped. Throughout the day, crews are working tirelessly to get these tripped elements ready for restoration. Your job is to get service restored to customers as quickly and safely as possible. Note that when a line or substation turns from red to white it is eligible to be restored."
        ]
    },
    costs: { record: 12.90, good: 18.0, okay: 30.0 },
    weather: ['load', 'solar', 'wind'],
    hints: ["Keep checking the coastal substations and lines to see if anything new has become ready for restoration"],

    start(state) {
        // Hurricane damage: trip generation and load units
        tripUnits(state, SUB.Armstrong);                         // all 5 wind units
        tripUnits(state, SUB.Brownsville);                       // all 3 load units
        tripUnits(state, SUB.CorpusChristi);                     // all 4 load units
        disableUnits(state, SUB.ElCampo);                        // all 8 gas CC units
        tripUnits(state, SUB.Galveston);                         // all 4 load units
        tripUnits(state, SUB.Houston);                           // all 8 load units
        tripUnits(state, SUB.Katy, { from: 2, count: 3 });      // units 2-4
        tripUnits(state, SUB.Mission, { from: 1, count: 3 });   // units 1-3
        tripUnits(state, SUB.Pasadena);                          // all 4 gas turbine units
        tripUnits(state, SUB.Wadsworth);                         // both nuclear units

        // Hurricane damage: trip transmission lines
        tripBranch(state, LINE.Armstrong_CorpusChristi);
        tripBranch(state, LINE.Brownsville_Armstrong);
        tripBranch(state, LINE.Brownsville_CorpusChristi);
        tripBranch(state, LINE.CorpusChristi_ElCampo);
        tripBranch(state, LINE.CorpusChristi_Wadsworth);
        tripBranch(state, LINE.ElCampo_Katy);
        tripBranch(state, LINE.ElCampo_SanAntonio);
        tripBranch(state, LINE.Galveston_Katy);
        tripBranch(state, LINE.Galveston_Pasadena);
        tripBranch(state, LINE.Houston_CollegeStation);
        tripBranch(state, LINE.Houston_ElCampo, 'both');
        tripBranch(state, LINE.Houston_Pasadena);
        tripBranch(state, LINE.Katy_Houston, 'both');
        tripBranch(state, LINE.Katy_Rockdale, 'both');
        tripBranch(state, LINE.Mission_Brownsville);
        tripBranch(state, LINE.Mission_CorpusChristi);
        tripBranch(state, LINE.Pasadena_CollegeStation);
        tripBranch(state, LINE.Wadsworth_ElCampo, 'both');
        tripBranch(state, LINE.Wadsworth_Galveston);

        // Override Rockdale coal output
        setUnitPower(state, SUB.Rockdale, 290);

        // McCamey solar already ready
        enableUnits(state, SUB.McCamey);
    },

    update(state) {
        processTimedRestorations(state, HURRICANE_RESTORATIONS);
    },
});

// ============================================================
// Export all scenarios
// ============================================================

export const scenarios: Record<number, IScenario> = {
    1: day1,
    2: day2,
    3: day3,
    4: day4,
    5: day5,
};

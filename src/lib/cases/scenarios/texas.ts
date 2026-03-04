import { GridModelApi, Scenario, UnitStatus } from "$lib/types";
import { Wind, Solar, Demand } from "$lib/weather";
import { SUB, LINE } from "$data/_out/texas/lookups";

// --- Scenario timing helpers ---

/** Convert PM clock time to seconds elapsed. Game starts at 1:00 PM (t=0). */
function time(h: number, m: number = 0) { return (h - 1) * 3600 + m * 60; }

interface TimedUnitTrip { at: number; sub: string; unit: number }

type TimedRestoration =
    | { at: number; branch: string }
    | { at: number; sub: string; units?: { from?: number; count?: number } };

function processTimedTrips(
    t: number, grid: GridModelApi, trips: TimedUnitTrip[],
    msg?: (name: string, unit: number) => string,
) {
    for (const { at, sub, unit } of trips) {
        if (t !== at) continue;
        const s = grid.state.subs[sub];
        if (!s || unit >= s.U.length) continue;
        grid.setUnitStatus(sub, UnitStatus.TRIP, unit);
        grid.pushAlert(msg?.(s.Name, unit) ?? `${s.Name} unit #${unit + 1} tripped`, true);
    }
}

function processTimedRestorations(t: number, grid: GridModelApi, restorations: TimedRestoration[]) {
    for (const r of restorations) {
        if (t !== r.at) continue;
        if ('branch' in r) grid.readyBranch(r.branch);
        else grid.readyUnits(r.sub, r.units);
    }
}

// ============================================================
// Day 1: The Baseline Day
// Load rises, wind steady, solar fades in the evening
// ============================================================

const day1: Scenario = {
    info: [
        "Your goal is to avoid a blackout and keep operating costs as low as possible.",
        "Your shift runs from 1pm to 11pm.",
        "Load (electrical demand from customers) is expected to rise, peak around 7pm, and then decline later in the night.",
        "There is a steady, moderate wind predicted for the whole afternoon and evening.",
        "Keep in mind the solar generation will go down later in the afternoon!",
    ],
    costs: { record: 1.65, good: 2.0, okay: 10.0 },
    weather: { load: Demand.EVENING_PEAK, sun: Solar.PHYSICAL },
    hints: [
        "The McCamey Solar PV plant in West Texas is currently disconnected. You might as well start up all 3 units at that plant to get more, low-cost energy.",
        "The Mission Gas Turbine plant in South Texas has very high costs. Try shutting down 1-3 of these units while you still have plenty of reserves.",
        "You are going to need more reserves in the evening once the solar has gone down and the load is higher.",
        "For the rest of the day, watch the reserves carefully. If they get below 500 MW you need to find new generation to start up.",
    ],

    update(_t, _grid, weather) {
        // Gentle wind drift around baseline
        const wind = weather.get('wind');
        if (wind < 0.53 && wind > 0.43) {
            if (Math.random() < 0.25) weather.nudge('wind', 0.0001);
            else if (Math.random() < 0.333) weather.nudge('wind', -0.0001);
        }
    },
};

// ============================================================
// Day 2: Maintenance Constraint
// High wind coming, but Abilene-Ft Worth lines go down at 2:30 PM
// ============================================================

const day2: Scenario = {
    info: [
        "Your goal is to avoid a blackout and keep operating costs as low as possible.",
        "Wind availability will rise steadily this afternoon, up to nearly 100% by 4pm and remain high for the rest of your shift.",
        "Other conditions are the same as yesterday.",
        "Unfortunately, at 2:30 PM both transmission lines from Abilene to Ft Worth will need to be taken offline due to some unavoidable maintenance issues.",
        "Watch transmission line loading. If lines are overloaded 120% or more they may trip, triggering a cascade and blackout!",
    ],
    costs: { record: 1.41, good: 2.0, okay: 10.0 },
    weather: { 
        load: Demand.EVENING_PEAK, 
        sun: Solar.PHYSICAL, 
        wind: Wind.DIURNAL 
    },
    hints: ["Watch the East-West lines. If they turn yellow or orange start shutting down western generation"],

    update(t, grid) {
        if (t === time(2, 30)) {
            grid.tripBranch(LINE.FtWorth_Abilene);
            grid.tripBranch(LINE.FtWorth_Abilene_2);
            grid.pushAlert('Maintenance requires tripping both Abilene - Ft Worth lines');
        }
    },
};

// ============================================================
// Day 3: Tornado + Equipment Shutdown
// High wind, tornados near Abilene at 5pm, Wadsworth Unit #1 shuts down at 1:30 PM
// ============================================================

const TORNADO_BRANCHES = [
    LINE.Abilene_McCamey,
    LINE.Abilene_Odessa,
    LINE.Abilene_Snyder,
    LINE.Abilene_Snyder_2,
    LINE.Abilene_Waco,
    LINE.FtWorth_Abilene,
    LINE.FtWorth_Abilene_2,
    LINE.FtWorth_Snyder,
];

const day3: Scenario = {
    info: [
        "Your goal is to avoid a blackout and keep operating costs as low as possible.",
        "Wind is expected to be high, as yesterday.",
        "Tornados are expected near Abilene around 5pm, and any nearby transmission lines are subject to tripping.",
        "In addition, a scheduled shutdown of Wadsworth Unit #1 begins at 1:30 PM.",
    ],
    costs: { record: 3.35, good: 5.0, okay: 15.0 },
    weather: { 
        load: Demand.EVENING_PEAK, 
        sun: Solar.PHYSICAL, 
        wind: Wind.DIURNAL 
    },
    hints: ["No hints for Day 3: You can do this!"],

    update(t, grid) {
        // Tornado: after 5:00 PM, 5% chance each tick to trip Abilene-area branches
        if (t > time(5, 0)) {
            grid.randomTrips(TORNADO_BRANCHES, 0.05, 'due to tornado');
        }

        // Scheduled shutdown of Wadsworth Unit #1 at 1:30 PM
        if (t === time(1, 30)) {
            grid.setUnitStatus(SUB.Wadsworth, UnitStatus.SHUTDOWN, 0);
            grid.pushAlert('Scheduled shutdown of Wadsworth Unit #1 begins');
        }
    },
};

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

const day4: Scenario = {
    info: [
        "Your goal is to avoid a blackout and keep operating costs as low as possible.",
        "Generators will be tripping significantly due to cold weather.",
        "Intentional load shedding will be necessary to avoid frequency issues and blackout.",
    ],
    costs: { record: 3.22, good: 8.0, okay: 20.0 },
    weather: { 
        load: Demand.EVENING_PEAK, 
        sun: Solar.PHYSICAL, 
        wind: Wind.DIURNAL 
    },
    hints: ["Things can happen really fast when there is rapid loss of generation. Stay vigilent!"],

    update(t, grid) {
        processTimedTrips(t, grid, COLD_WEATHER_TRIPS,
            (subName, unitIdx) => `${subName} unit #${unitIdx + 1} trips due to cold weather`);
    },
};

// ============================================================
// Day 5: Hurricane Restoration
// Post-hurricane with massive damage, crews restoring throughout the day
// ============================================================

const HURRICANE_RESTORATIONS: TimedRestoration[] = [
    // 1:30 PM — Houston loads begin coming back (first 3 units)
    { at: time(1, 30), sub: SUB.Houston,       units: { count: 3 } },
    { at: time(1, 50), branch: LINE.Katy_Houston_2 },
    { at: time(2, 10), sub: SUB.CorpusChristi },
    { at: time(2, 30), branch: LINE.Houston_Pasadena },
    { at: time(2, 50), branch: LINE.Wadsworth_ElCampo },
    { at: time(3, 10), sub: SUB.Brownsville },
    { at: time(3, 30), branch: LINE.Armstrong_CorpusChristi },
    { at: time(3, 50), branch: LINE.Mission_Brownsville },
    { at: time(4, 10), sub: SUB.Pasadena,      units: { count: 2 } },
    { at: time(4, 20), sub: SUB.Houston,        units: { from: 3, count: 5 } },
    { at: time(4, 50), sub: SUB.Katy,           units: { from: 2, count: 3 } },
    { at: time(5, 10), branch: LINE.Brownsville_Armstrong },
    { at: time(5, 30), sub: SUB.Pasadena,       units: { from: 2, count: 2 } },
    { at: time(6, 0),  sub: SUB.Mission,        units: { from: 1, count: 3 } },
    { at: time(7, 0),  sub: SUB.Galveston,      units: { count: 2 } },
    { at: time(7, 30), branch: LINE.Galveston_Pasadena },
    { at: time(8, 0),  sub: SUB.Armstrong,      units: { from: 3, count: 2 } },
    { at: time(8, 10), sub: SUB.Galveston,      units: { from: 2, count: 2 } },
    { at: time(8, 20), branch: LINE.CorpusChristi_ElCampo },
    { at: time(8, 30), branch: LINE.ElCampo_Katy },
    { at: time(8, 40), branch: LINE.CorpusChristi_Wadsworth },
    { at: time(9, 10), branch: LINE.Galveston_Katy },
    { at: time(9, 20), branch: LINE.Pasadena_CollegeStation },
    { at: time(9, 40), branch: LINE.ElCampo_SanAntonio },
    { at: time(10, 0), branch: LINE.Katy_Rockdale },
];

const day5: Scenario = {
    info: [
        "Ready for the last challenge? On Day 5, your shift starts after an extreme hurricane hit this morning. Many loads, lines, and generators along the gulf coast are tripped. Throughout the day, crews are working tirelessly to get these tripped elements ready for restoration. Your job is to get service restored to customers as quickly and safely as possible. Note that when a line or substation turns from red to white it is eligible to be restored.",
    ],
    costs: { record: 12.90, good: 18.0, okay: 30.0 },
    weather: { 
        load: Demand.EVENING_PEAK, 
        sun: Solar.PHYSICAL, 
        wind: Wind.DIURNAL
    },
    hints: ["Keep checking the coastal substations and lines to see if anything new has become ready for restoration"],

    start(_t, grid) {
        // Hurricane damage: trip generation and load units
        grid.setUnitStatus(SUB.Armstrong, UnitStatus.TRIP);                         // all 5 wind units
        grid.setUnitStatus(SUB.Brownsville, UnitStatus.TRIP);                       // all 3 load units
        grid.setUnitStatus(SUB.CorpusChristi, UnitStatus.TRIP);                     // all 4 load units
        grid.setUnitStatus(SUB.ElCampo, UnitStatus.DIS);                            // all 8 gas CC units
        grid.setUnitStatus(SUB.Galveston, UnitStatus.TRIP);                         // all 4 load units
        grid.setUnitStatus(SUB.Houston, UnitStatus.TRIP);                           // all 8 load units
        grid.setUnitStatus(SUB.Katy, UnitStatus.TRIP, { from: 2, count: 3 });      // units 2-4
        grid.setUnitStatus(SUB.Mission, UnitStatus.TRIP, { from: 1, count: 3 });   // units 1-3
        grid.setUnitStatus(SUB.Pasadena, UnitStatus.TRIP);                          // all 4 gas turbine units
        grid.setUnitStatus(SUB.Wadsworth, UnitStatus.TRIP);                         // both nuclear units

        // Hurricane damage: trip transmission lines
        grid.tripBranch(LINE.Armstrong_CorpusChristi);
        grid.tripBranch(LINE.Brownsville_Armstrong);
        grid.tripBranch(LINE.Brownsville_CorpusChristi);
        grid.tripBranch(LINE.CorpusChristi_ElCampo);
        grid.tripBranch(LINE.CorpusChristi_Wadsworth);
        grid.tripBranch(LINE.ElCampo_Katy);
        grid.tripBranch(LINE.ElCampo_SanAntonio);
        grid.tripBranch(LINE.Galveston_Katy);
        grid.tripBranch(LINE.Galveston_Pasadena);
        grid.tripBranch(LINE.Houston_CollegeStation);
        grid.tripBranch(LINE.Houston_ElCampo);
        grid.tripBranch(LINE.Houston_ElCampo_2);
        grid.tripBranch(LINE.Houston_Pasadena);
        grid.tripBranch(LINE.Katy_Houston);
        grid.tripBranch(LINE.Katy_Houston_2);
        grid.tripBranch(LINE.Katy_Rockdale);
        grid.tripBranch(LINE.Mission_Brownsville);
        grid.tripBranch(LINE.Mission_CorpusChristi);
        grid.tripBranch(LINE.Pasadena_CollegeStation);
        grid.tripBranch(LINE.Wadsworth_ElCampo);
        grid.tripBranch(LINE.Wadsworth_ElCampo_2);
        grid.tripBranch(LINE.Wadsworth_Galveston);

        // Override Rockdale coal output
        grid.setUnitPower(SUB.Rockdale, 290);

        // McCamey solar already ready
        grid.setUnitStatus(SUB.McCamey, UnitStatus.IN);
    },

    update(t, grid) {
        processTimedRestorations(t, grid, HURRICANE_RESTORATIONS);
    },
};

// ============================================================
// Export all scenarios
// ============================================================

export const scenarios: Record<number, Scenario> = {
    1: day1,
    2: day2,
    3: day3,
    4: day4,
    5: day5,
};

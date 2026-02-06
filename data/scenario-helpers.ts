import { SimState, AlertHandler, HintHandler, Briefing, UnitStatus, BranchStatus, IScenario, ResultDetails } from "@/lib/types";
import { evaluateResults } from "@/lib/utils";

// --- Time Helpers ---

/**
 * Convert a clock time to a simulation tick.
 * Game starts at 1:00 PM (t=0), each tick = 1 minute.
 * Example: time(2, 30) returns 90 (for 2:30 PM)
 */
export function time(hour: number, minute: number = 0): number {
    return (hour - 1) * 60 + minute;
}

// --- Weather Helpers ---

export interface WeatherConfig {
    initialLoad: number;
    initialWind: number;
    initialSolar: number;
}

export const DEFAULT_WEATHER: WeatherConfig = {
    initialLoad: 0.83,
    initialWind: 0.48,
    initialSolar: 1.00,
};

export function initWeather(state: SimState, config: WeatherConfig = DEFAULT_WEATHER) {
    state.frLoad = config.initialLoad;
    state.frWind = config.initialWind;
    state.frSolar = config.initialSolar;
}

export function updateLoadCurve(state: SimState) {
    if (state.t < 360) state.frLoad = 0.83 + 0.0002777 * state.t;
    else state.frLoad = 0.93 - 0.0008333 * (state.t - 360);
}

export function updateSolarFadeout(state: SimState) {
    if (state.t >= 240) state.frSolar = Math.max(0, 1 - (state.t - 240) / 120);
}

export function updateWindRamp(state: SimState) {
    if (state.t < 180) state.frWind = 0.48 + 0.0028 * state.t;
}

// --- State Mutation Helpers ---

/** Trip a single unit at a substation. */
export function tripUnit(state: SimState, subId: string, unitIndex: number): void {
    state.subs[subId].U[unitIndex].Status = UnitStatus.TRIP;
}

/** Trip units at a substation (all by default, or a range). */
export function tripUnits(state: SimState, subId: string, range?: { from?: number; count?: number }): void {
    const sub = state.subs[subId];
    const from = range?.from ?? 0;
    const count = range?.count ?? sub.U.length - from;
    const end = Math.min(from + count, sub.U.length);
    for (let i = from; i < end; i++) {
        sub.U[i].Status = UnitStatus.TRIP;
    }
}

/** Set units to DIS (disconnected). */
export function disableUnits(state: SimState, subId: string, range?: { from?: number; count?: number }): void {
    const sub = state.subs[subId];
    const from = range?.from ?? 0;
    const count = range?.count ?? sub.U.length - from;
    const end = Math.min(from + count, sub.U.length);
    for (let i = from; i < end; i++) {
        sub.U[i].Status = UnitStatus.DIS;
    }
}

/** Set units to IN (in service). */
export function enableUnits(state: SimState, subId: string, range?: { from?: number; count?: number }): void {
    const sub = state.subs[subId];
    const from = range?.from ?? 0;
    const count = range?.count ?? sub.U.length - from;
    const end = Math.min(from + count, sub.U.length);
    for (let i = from; i < end; i++) {
        sub.U[i].Status = UnitStatus.IN;
    }
}

/** Shut down a single unit (graceful SHUTDOWN status). */
export function shutdownUnit(state: SimState, subId: string, unitIndex: number): void {
    state.subs[subId].U[unitIndex].Status = UnitStatus.SHUTDOWN;
}

/** Trip one or both circuits on a branch. */
export function tripBranch(state: SimState, branchId: string, circuits: 1 | 2 | 'both' = 1): void {
    const br = state.branches[branchId];
    if (circuits === 1 || circuits === 'both') br.Status1 = BranchStatus.TRIP;
    if (circuits === 2 || circuits === 'both') br.Status2 = BranchStatus.TRIP;
    state.Ybus = null;
}

/** Randomly trip branches each tick with a given probability. Skips already-tripped lines. */
export function randomBranchTrips(
    state: SimState,
    branchIds: string[],
    probability: number,
    onAlert?: AlertHandler,
    reason?: string,
): void {
    for (const id of branchIds) {
        if (Math.random() >= probability) continue;
        const br = state.branches[id];
        if (br.Status1 === BranchStatus.TRIP) continue;
        br.Status1 = BranchStatus.TRIP;
        br.Status2 = BranchStatus.TRIP;
        state.Ybus = null;
        const suffix = reason ? ` ${reason}` : '';
        onAlert?.({ message: `${br.sub1?.Name}-${br.sub2?.Name} transmission line trips${suffix}`, critical: true });
    }
}

/** Restore tripped units to DIS (ready for operator reconnection). Only changes TRIP → DIS. */
export function readyUnits(state: SimState, subId: string, range?: { from?: number; count?: number }): void {
    const sub = state.subs[subId];
    const from = range?.from ?? 0;
    const count = range?.count ?? sub.U.length - from;
    const end = Math.min(from + count, sub.U.length);
    for (let i = from; i < end; i++) {
        if (sub.U[i].Status === UnitStatus.TRIP) sub.U[i].Status = UnitStatus.DIS;
    }
}

/** Restore a tripped branch circuit to DIS. Only changes TRIP → DIS. */
export function readyBranch(state: SimState, branchId: string, circuit: 1 | 2 = 1): void {
    const br = state.branches[branchId];
    if (circuit === 1 && br.Status1 === BranchStatus.TRIP) br.Status1 = BranchStatus.DIS;
    if (circuit === 2 && br.Status2 === BranchStatus.TRIP) br.Status2 = BranchStatus.DIS;
}

/** Set power output for units at a substation. */
export function setUnitPower(state: SimState, subId: string, power: number, range?: { from?: number; count?: number }): void {
    const sub = state.subs[subId];
    const from = range?.from ?? 0;
    const count = range?.count ?? sub.U.length - from;
    const end = Math.min(from + count, sub.U.length);
    for (let i = from; i < end; i++) {
        sub.U[i].P = power;
    }
}

// --- Timed Event Processing ---

export interface TimedUnitTrip {
    at: number;
    sub: string;
    unit: number;
}

export function processTimedTrips(
    state: SimState,
    trips: TimedUnitTrip[],
    onAlert: AlertHandler | undefined,
    defaultMessage?: (subName: string, unitIdx: number) => string
): void {
    for (const trip of trips) {
        if (state.t !== trip.at) continue;
        const sub = state.subs[trip.sub];
        if (!sub || trip.unit >= sub.U.length) continue;
        sub.U[trip.unit].Status = UnitStatus.TRIP;
        const msg = defaultMessage?.(sub.Name, trip.unit) ?? `${sub.Name} unit #${trip.unit + 1} tripped`;
        onAlert?.({ message: msg, critical: true });
    }
}

export type TimedRestoration =
    | { at: number; branch: string; circuit: 1 | 2 }
    | { at: number; sub: string; units?: { from?: number; count?: number } };

export function processTimedRestorations(state: SimState, restorations: TimedRestoration[]): void {
    for (const r of restorations) {
        if (state.t !== r.at) continue;
        if ('branch' in r) {
            readyBranch(state, r.branch, r.circuit);
        } else {
            readyUnits(state, r.sub, r.units);
        }
    }
}

// --- Scenario Builder ---

export type WeatherCurve = 'load' | 'solar' | 'wind';

const WEATHER_UPDATERS: Record<WeatherCurve, (state: SimState) => void> = {
    load: updateLoadCurve,
    solar: updateSolarFadeout,
    wind: updateWindRamp,
};

export interface CostThresholds {
    record: number;
    good: number;
    okay: number;
}

export function defineScenario(config: {
    day: number;
    briefing: Briefing;
    costs: CostThresholds;
    weather?: WeatherCurve[];
    hints?: string[];
    start?: (state: SimState, onAlert?: AlertHandler, onHint?: HintHandler) => void;
    update?: (state: SimState, onAlert?: AlertHandler, onHint?: HintHandler) => void;
}): IScenario {
    return {
        day: config.day,
        briefing: config.briefing,
        start(state: SimState, onAlert: AlertHandler | undefined, onHint: HintHandler | undefined): void {
            initWeather(state);
            config.start?.(state, onAlert, onHint);
            if (config.hints) {
                for (let i = 0; i < config.hints.length; i++) {
                    onHint?.({ message: config.hints[i] }, i === 0);
                }
            }
        },
        update(state: SimState, onAlert: AlertHandler | undefined, onHint: HintHandler | undefined): void {
            if (config.weather) {
                for (const curve of config.weather) WEATHER_UPDATERS[curve](state);
            }
            config.update?.(state, onAlert, onHint);
        },
        getResultDetails(totalCost: number): ResultDetails {
            return evaluateResults(totalCost, config.costs.record, config.costs.good, config.costs.okay);
        },
    };
}

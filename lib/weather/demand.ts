export enum Demand {
    EVENING_PEAK = 'evening-peak',  // Ramp -> 7 PM peak -> decline
}

export const BASE_LOAD = 0.83;
const PEAK_LOAD = 0.93;
const END_LOAD = 0.73;
const LOAD_PEAK_ELAPSED = 6;          // 6 hours after start = 7 PM
const LOAD_END_ELAPSED = 10;          // 10 hours after start = 11 PM

/** Load demand fraction from evening peak pattern. Returns 0–1. */
export function loadEveningPeak(elapsedHours: number): number {
    if (elapsedHours < LOAD_PEAK_ELAPSED)
        return BASE_LOAD + (PEAK_LOAD - BASE_LOAD) * elapsedHours / LOAD_PEAK_ELAPSED;
    return PEAK_LOAD - (PEAK_LOAD - END_LOAD) * (elapsedHours - LOAD_PEAK_ELAPSED) / (LOAD_END_ELAPSED - LOAD_PEAK_ELAPSED);
}

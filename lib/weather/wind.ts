export enum Wind {
    DIURNAL = 'diurnal',       // Afternoon peak, evening decline
}

export const BASE_WIND = 0.48;
const PEAK_WIND = 0.98;
const WIND_PEAK_HOUR = 16;            // 4 PM — peak
const WIND_DECLINE_HOUR = 19;         // 7 PM — start declining
const WIND_END_HOUR = 23;             // 11 PM
const WIND_EVENING_FLOOR = 0.70;

/** Smooth cosine interpolation: 0→1 maps smoothly from a to b. */
function smoothstep(a: number, b: number, t: number): number {
    const ct = 0.5 - 0.5 * Math.cos(Math.PI * Math.max(0, Math.min(1, t)));
    return a + (b - a) * ct;
}

/** Wind capacity fraction from diurnal pattern. Returns 0–1. */
export function windDiurnal(hour: number, startHour: number): number {
    if (hour < WIND_PEAK_HOUR) {
        const t = (hour - startHour) / (WIND_PEAK_HOUR - startHour);
        return smoothstep(BASE_WIND, PEAK_WIND, t);
    }
    if (hour > WIND_DECLINE_HOUR) {
        const t = (hour - WIND_DECLINE_HOUR) / (WIND_END_HOUR - WIND_DECLINE_HOUR);
        return smoothstep(PEAK_WIND, WIND_EVENING_FLOOR, t);
    }
    return PEAK_WIND;
}

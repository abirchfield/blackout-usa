import { SimState, Model, WeatherModelApi, TimeConfig } from "$lib/types";
import { clamp } from "$lib/grid/utils";

// ============================================================
// Wind Model
// ============================================================

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
        if (startHour >= WIND_PEAK_HOUR) return PEAK_WIND;
        const t = (hour - startHour) / (WIND_PEAK_HOUR - startHour);
        return smoothstep(BASE_WIND, PEAK_WIND, t);
    }
    if (hour > WIND_DECLINE_HOUR) {
        const t = (hour - WIND_DECLINE_HOUR) / (WIND_END_HOUR - WIND_DECLINE_HOUR);
        return smoothstep(PEAK_WIND, WIND_EVENING_FLOOR, t);
    }
    return PEAK_WIND;
}

// ============================================================
// Solar Model
// ============================================================

export enum Solar {
    PHYSICAL = 'physical',     // Sun elevation angle (latitude-dependent)
}

const DEG2RAD = Math.PI / 180;
export const DEFAULT_DAY_OF_YEAR = 172; // June 21

/** Solar capacity fraction from sun elevation angle. Returns 0–1. */
export function solarFraction(latitude: number, dayOfYear: number, hour24: number): number {
    const latRad = latitude * DEG2RAD;
    // Solar declination: Earth's axial tilt toward sun
    const decl = -23.45 * DEG2RAD * Math.cos(2 * Math.PI * (dayOfYear + 10) / 365);
    // Hour angle: 0 at solar noon (12:00), 15° per hour
    const ha = (hour24 - 12) * 15 * DEG2RAD;

    const sinElev = Math.sin(latRad) * Math.sin(decl)
                  + Math.cos(latRad) * Math.cos(decl) * Math.cos(ha);
    if (sinElev <= 0) return 0; // Sun below horizon

    // Normalize so that solar noon → 1.0
    const peakElev = Math.sin(latRad) * Math.sin(decl)
                   + Math.cos(latRad) * Math.cos(decl); // ha=0
    return sinElev / Math.max(peakElev, 0.01);
}

// ============================================================
// Demand Model
// ============================================================

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

// ============================================================
// Weather Config & Model
// ============================================================

export interface WeatherConfig {
    wind?: Wind;
    sun?: Solar;
    load?: Demand;
}

export type WeatherKey = keyof WeatherConfig;

const DEFAULTS = { loadLevel: BASE_LOAD, windAvail: BASE_WIND, sunAvail: 1.00 };

const KEY_MAP: Record<WeatherKey, 'loadLevel' | 'windAvail' | 'sunAvail'> = {
    load: 'loadLevel', wind: 'windAvail', sun: 'sunAvail',
};

export class WeatherModel implements Model, WeatherModelApi {
    private state: SimState;
    private timeConfig: TimeConfig;
    private lat: number;
    private config: WeatherConfig = {};

    constructor(state: SimState, timeConfig: TimeConfig, latitude: number) {
        this.state = state;
        this.timeConfig = timeConfig;
        this.lat = latitude;
    }

    setup(): void { }

    private currentHour(): number { return this.timeConfig.startHour + this.state.t / 3600; }
    private elapsedHours(): number { return this.state.t / 3600; }

    // --- WeatherModelApi (scenario-facing API) ---

    get(key: WeatherKey): number { return this.state[KEY_MAP[key]]; }
    set(key: WeatherKey, value: number): void { this.state[KEY_MAP[key]] = clamp(value, 0, 1); }

    nudge(key: WeatherKey, delta: number): void {
        const k = KEY_MAP[key];
        this.state[k] = clamp(this.state[k] + delta, 0, 1);
    }

    // --- Lifecycle ---

    /** Configure which models are active for this scenario. */
    setModels(config?: WeatherConfig): void {
        this.config = config ?? {};
    }

    /** Reset weather values to defaults (or physics-derived initial values). */
    reset(): void {
        this.state.loadLevel = DEFAULTS.loadLevel;
        this.state.windAvail = DEFAULTS.windAvail;
        // Compute initial solar from physics at t=0
        if (this.config.sun === Solar.PHYSICAL) {
            this.state.sunAvail = solarFraction(
                this.lat, DEFAULT_DAY_OF_YEAR, this.timeConfig.startHour);
        } else {
            this.state.sunAvail = DEFAULTS.sunAvail;
        }
    }

    /** Apply weather models for this tick, clamping all values to [0,1]. */
    tick(_dt: number): void {
        const hour = this.currentHour();
        const elapsed = this.elapsedHours();

        if (this.config.load === Demand.EVENING_PEAK) {
            this.state.loadLevel = loadEveningPeak(elapsed);
        }
        if (this.config.sun === Solar.PHYSICAL) {
            this.state.sunAvail = solarFraction(
                this.lat, DEFAULT_DAY_OF_YEAR, hour);
        }
        if (this.config.wind === Wind.DIURNAL) {
            this.state.windAvail = windDiurnal(hour, this.timeConfig.startHour);
        }

        this.state.loadLevel = clamp(this.state.loadLevel, 0, 1);
        this.state.windAvail = clamp(this.state.windAvail, 0, 1);
        this.state.sunAvail  = clamp(this.state.sunAvail, 0, 1);
    }
}

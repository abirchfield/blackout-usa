import { SimState, IModel, IWeatherModel, TimeConfig } from "@/lib/types";
import { clamp } from "@/lib/grid/utils";
import { Solar, solarFraction, DEFAULT_DAY_OF_YEAR } from "./solar";
import { Wind, windDiurnal, BASE_WIND } from "./wind";
import { Demand, loadEveningPeak, BASE_LOAD } from "./demand";

export { Wind } from "./wind";
export { Solar } from "./solar";
export { Demand } from "./demand";

export interface WeatherConfig {
    wind?: Wind;
    sun?: Solar;
    load?: Demand;
}

export type WeatherKey = keyof WeatherConfig;

const STATE_KEY = { load: 'loadLevel', wind: 'windAvail', sun: 'sunAvail' } as const;

const DEFAULTS = { loadLevel: BASE_LOAD, windAvail: BASE_WIND, sunAvail: 1.00 };

export class WeatherModel implements IModel, IWeatherModel {
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

    // --- Derived time helpers ---

    /** Current 24-hour clock hour (e.g. 13.5 = 1:30 PM). */
    private currentHour(): number {
        return this.timeConfig.startHour + this.state.t / 3600;
    }

    /** Hours elapsed since scenario start. */
    private elapsedHours(): number {
        return this.state.t / 3600;
    }

    // --- IWeatherModel (scenario-facing API) ---

    get(key: WeatherKey): number {
        return this.state[STATE_KEY[key]];
    }

    set(key: WeatherKey, value: number): void {
        this.state[STATE_KEY[key]] = clamp(value, 0, 1);
    }

    nudge(key: WeatherKey, delta: number): void {
        const k = STATE_KEY[key];
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
    tick(dt: number): void {
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

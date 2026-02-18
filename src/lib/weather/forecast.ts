import { WeatherConfig, Wind, windDiurnal, BASE_WIND, Solar, solarFraction, DEFAULT_DAY_OF_YEAR } from "./index";
import { GAME_DURATION_S } from "$lib/grid/constants";

export interface ForecastPoint {
  hour: number;      // 24h clock (e.g. 13.0, 13.5)
  windAvail: number; // 0–1
  sunAvail: number;  // 0–1
}

export interface ForecastData {
  points: ForecastPoint[];
  startHour: number;
  durationHours: number;
  hasWind: boolean;
  hasSolar: boolean;
}

const DURATION_HOURS = GAME_DURATION_S / 3600;
const DEFAULT_FORECAST_SAMPLES = 120;

/**
 * Pre-compute the full day's weather forecast from deterministic models.
 * Called once per day navigation — ~120 iterations of simple math.
 */
export function computeForecast(
  weatherConfig: WeatherConfig | undefined,
  startHour: number,
  latitude: number,
  samples = DEFAULT_FORECAST_SAMPLES,
): ForecastData {
  const hasWind = weatherConfig?.wind === Wind.DIURNAL;
  const hasSolar = weatherConfig?.sun === Solar.PHYSICAL;
  const points: ForecastPoint[] = new Array(samples);

  for (let i = 0; i < samples; i++) {
    const elapsed = samples <= 1 ? 0 : (i / (samples - 1)) * DURATION_HOURS;
    const hour = startHour + elapsed;
    points[i] = {
      hour,
      windAvail: hasWind ? windDiurnal(hour, startHour) : BASE_WIND,
      sunAvail: hasSolar ? solarFraction(latitude, DEFAULT_DAY_OF_YEAR, hour) : 1,
    };
  }

  return { points, startHour, durationHours: DURATION_HOURS, hasWind, hasSolar };
}

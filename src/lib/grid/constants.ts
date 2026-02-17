// --- Power System Fundamentals ---
export const BASE_FREQUENCY = 60.0;
export const BASE_MVA = 100.0;

// --- Stability & Blackout ---
export const FREQUENCY_BLACKOUT_THRESHOLD = 58.0;
export const FREQUENCY_MAX = 66.0;
export const FREQUENCY_DROOP = 0.2;
export const FREQUENCY_ADJUSTMENT_THRESHOLD_MW = 500;
export const MIN_GENERATION_FOR_FREQ_STABILITY_MW = 5;

// --- Unit Transitions ---
export const SHUTDOWN_THRESHOLD_MW = 1;

// --- Frequency Adjustment ---
export const FREQ_STEP_LARGE = 0.05;
export const FREQ_STEP_SMALL = 0.01;

// --- Solver ---
export const ALPHA_MIN = -1;
export const ALPHA_MAX = 1;
export const MAX_ITER = 10;
export const ALPHA_TOLERANCE = 1e-6;
export const REF_ADMITTANCE = 10000;

// --- Contingency: Frequency Trip Thresholds ---


export const FREQ_TRIP_CRITICAL_LOW = 57;
export const FREQ_TRIP_LL    = 59;
export const FREQ_TRIP_L     = 59.3;
export const FREQ_TRIP_H     = 60.7;
export const FREQ_TRIP_HH    = 61;
export const FREQ_TRIP_CRITICAL_HIGH = 63;

export const PROB_TRIP_FREQ_CRITICAL = 0.05;
export const PROB_TRIP_FREQ_HIGH     = 0.01;
export const PROB_TRIP_FREQ_NORMAL   = 0.001;

// --- Contingency: Overload Trip Thresholds ---
export const OVERLOAD_TRIP_CRITICAL_MULTIPLIER = 1.5;
export const PROB_TRIP_OVERLOAD_CRITICAL = 0.05;
export const OVERLOAD_TRIP_NORMAL_MULTIPLIER = 1.2;
export const PROB_TRIP_OVERLOAD_NORMAL = 0.01;

// --- Economics ---
export const UNSERVED_COST_PER_MW = 1000;

// --- Game Timing ---
export const SECONDS_PER_TICK = 60;              // Each tick = 1 game-minute
export const GAME_DURATION_S = 36_000;           // 10 hours in seconds
/** Costs are $/hr; divide by TICKS_PER_HOUR for per-tick contribution. */
export const TICKS_PER_HOUR = 60;
export const TICK_SPEED_NORMAL_MS = 500;         // Real-time ms per game tick
export const TICK_SPEED_FAST_MS = 50;            // Real-time ms per game tick (fast-forward)
export const DEFAULT_START_HOUR = 13;            // 24h clock, default scenario start

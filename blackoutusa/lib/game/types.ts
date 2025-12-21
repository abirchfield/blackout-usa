import * as math from "mathjs";

// --- Statuses ---
export const STATUS_IN = "IN";
export const STATUS_DIS = "DIS";
export const STATUS_TRIP = "TRIP";
export const STATUS_STARTUP = "STARTUP";
export const STATUS_SHUTDOWN = "SHUTDOWN";
export type UnitStatus = typeof STATUS_IN | typeof STATUS_DIS | typeof STATUS_TRIP | typeof STATUS_STARTUP | typeof STATUS_SHUTDOWN;
export type BranchCircuitStatus = typeof STATUS_IN | typeof STATUS_DIS | typeof STATUS_TRIP;

// --- Categories ---
export const CATEGORY_LOAD = "Load";
export const CATEGORY_WIND = "Wind";
export const CATEGORY_SOLAR = "Solar PV";
export const CATEGORY_NUCLEAR = "Nuclear Steam";
export type SubstationCategory = string; // Allow any string, but provide constants for known types

export interface Unit {
  Status: UnitStatus;
  P: number;
  Pset: number;
  P0: number;
  Status0: UnitStatus;
  StatusCount: number;
}

export interface Substation {
  Name: string;
  Latitude: number;
  Longitude: number;
  Units: number;
  Category: SubstationCategory;
  Pmax: number;
  Pmin: number;
  FixedCost: number;
  FuelCost: number;
  StartTime: number;
  Ramp: number;
  U: Unit[];
  Number: string;
  island?: number;
}

export interface Branch {
  Number: string;
  FromSub: string;
  ToSub: string;
  FromNum: string;
  ToNum: string;
  Status1: BranchCircuitStatus;
  Status2: BranchCircuitStatus;
  P: number;
  Pmax: number;
  Circuits: number;
  Z: number;
  // These are calculated at runtime, so they are optional in the raw data
  sub1?: Substation;
  sub2?: Substation;
  dist?: number;
}

export interface ScenarioData {
  subs: Record<string, Substation>;
  branches: Record<string, Branch>;
  borders: number[][];
  nsubs: number;
}

export interface Alert {
  message: string;
  critical: boolean;
}

export type AlertHandler = (alert: Alert, reset?: boolean) => void;

export type InteractionHandler = (type: 'sub' | 'branch', data: Substation | Branch) => void;

export interface GameState {
  // Game Loop Vars
  anim_cycle_state: number;
  scale_adjust: number;
  xmax: number;
  xmin: number;
  ymax: number;
  ymin: number;
  scale_max: number;
  scale_min: number;
  t: number;
  day: number;
  frequency: number;
  scaleX: number;
  scaleY: number;
  x0: number;
  y0: number;
  theme: 'light' | 'dark';
  
  // Input State
  inDrag: boolean;
  dragstartX: number;
  dragstartY: number;
  dragorigX: number;
  dragorigY: number;
  hoverBranch: Branch | null;
  hoverSub: Substation | null;

  // Data
  subs: Record<string, Substation>;
  branches: Record<string, Branch>;
  borders: number[][];
  nsubs: number;
  Ybus: math.Matrix | null;
  Yinv: math.LUDecomposition | null;
  
  // Metrics
  total_load_served: number;
  total_load_unserved: number;
  spin_reserves: number;
  total_wind: number;
  total_solar: number;
  total_thermal: number;
  total_nuclear: number;
  current_fuel_cost: number;
  current_running_cost: number;
  current_uload_cost: number;
  total_fuel_cost: number;
  total_running_cost: number;
  total_uload_cost: number;
  total_cost: number;
  average_cost: number;
  total_mwh: number;

  // Physics factors
  fr_load: number;
  fr_wind: number;
  fr_solar: number;
}

export interface DashboardStats {
  day: number;
  timeStr: string;
  timeStep: number;
  frequency: number;
  loadServed: number;
  loadUnserved: number;
  reserves: number;
  windGen: number;
  solarGen: number;
  thermalGen: number;
  nuclearGen: number;
  avgCost: number;
  totalCost: number;
  currentOpCost: number;
  currentFuelCost: number;
  currentUnservedCost: number;
  totalOpCost: number;
  totalFuelCost: number;
  totalUnservedCost: number;
  fr_wind: number;
  fr_solar: number;
}
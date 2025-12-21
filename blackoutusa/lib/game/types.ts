import * as math from "mathjs";

export interface Unit {
  Status: string;
  P: number;
  Pset: number;
  P0: number;
  Status0: string;
  StatusCount: number;
}

export interface Substation {
  Name: string;
  Latitude: number;
  Longitude: number;
  Units: number;
  Category: string;
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
  Status1: string;
  Status2: string;
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
}
import * as math from "mathjs";
import { KeyBindings } from "./key-bindings";

// --- Statuses ---
export enum UnitStatus {
  IN = "IN",
  DIS = "DIS",
  TRIP = "TRIP",
  STARTUP = "STARTUP",
  SHUTDOWN = "SHUTDOWN",
}

export enum BranchStatus {
  IN = "IN",
  DIS = "DIS",
  TRIP = "TRIP",
}
// --- Categories ---
export enum SubstationCategory {
  Load = "Load",
  Wind = "Wind",
  Solar = "Solar PV",
  Nuclear = "Nuclear Steam",
  Thermal = "Thermal",
  GasTurbine = "Gas Turbine",
  GasCombinedCycle = "Gas Combined Cycle",
  CoalFiredSteam = "Coal-fired Steam",
}

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
  Category: SubstationCategory; // Now strongly typed
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

export interface GameMetrics {
  loadServed: number;
  loadUnserved: number;
  reserves: number; // Total reserves
  reservesWind: number;
  reservesSolar: number;
  reservesThermal: number;
  reservesNuclear: number;
  windGen: number;
  solarGen: number;
  thermalGen: number;
  nuclearGen: number;
  currentFuelCost: number;
  currentOpCost: number;
  currentUnservedCost: number;
  totalFuelCost: number;
  totalOpCost: number;
  totalUnservedCost: number;
  totalCost: number;
  avgCost: number;
  totalMwh: number;
}

export interface Branch {
  Number: string;
  FromSub: string;
  ToSub: string;
  FromNum: string;
  ToNum: string;
  Status1: BranchStatus;
  Status2: BranchStatus;
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

export interface Briefing {
  title: string;
  points: string[];
  isList: boolean;
}

export interface Alert {
  message: string;
  critical: boolean;
}

export type AlertHandler = (alert: Alert, reset?: boolean) => void;

export interface Hint {
  message: string;
}

export type HintHandler = (hint: Hint, reset?: boolean) => void;

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
  animationsEnabled: boolean;
  renderCanvasText: boolean;
  debug_draw_map_bounds: boolean;
  keyBindings: KeyBindings;
  
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
  
  metrics: GameMetrics;
  // Physics factors
  fr_load: number;
  fr_wind: number;
  fr_solar: number;
}

export interface GameStatistics extends GameMetrics {
  day: number;
  timeStr: string;
  timeStep: number;
  frequency: number;
  fr_wind: number;
  fr_solar: number;
}
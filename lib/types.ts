import { KeyBindings } from "./key-bindings";
import * as math from "mathjs";

// Enums
export enum UnitStatus {
  IN = "IN",
  DIS = "DIS",
  STARTUP = "STARTUP",
  SHUTDOWN = "SHUTDOWN",
  TRIP = "TRIP"
}

export enum BranchStatus {
  IN = "IN",
  DIS = "DIS",
  TRIP = "TRIP"
}

export enum SubstationCategory {
  Nuclear = "Nuclear Steam",
  Thermal = "Thermal",
  GasTurbine = "Gas Turbine",
  GasCombinedCycle = "Gas Combined Cycle",
  CoalFiredSteam = "Coal-fired Steam",
  Wind = "Wind",
  Solar = "Solar PV",
  Load = "Load"
}

export enum LoadCategoryType {
  Residential = "Residential",
  Commercial = "Commercial",
  Industrial = "Industrial",
  Datacenter = "Datacenter"
}

// Interfaces
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
  Number: string;
  Category: SubstationCategory;
  LoadCategory?: LoadCategoryType;
  Units: number;
  Pmax: number;
  Pmin: number;
  Ramp: number;
  StartTime: number;
  FixedCost: number;
  FuelCost: number;
  Latitude: number;
  Longitude: number;
  U: Unit[];
  island?: number;
}

export interface Branch {
  Number: string;
  FromNum: string;
  ToNum: string;
  FromSub: string;
  ToSub: string;
  sub1?: Substation;
  sub2?: Substation;
  Circuits: number;
  Status1: BranchStatus;
  Status2: BranchStatus;
  P: number;
  Pmax: number;
  Z: number;
  dist?: number;
}

export interface GameMetrics {
  loadServed: number;
  loadUnserved: number;
  loadServedResidential: number;
  loadServedCommercial: number;
  loadServedIndustrial: number;
  loadServedDatacenter: number;
  reserves: number;
  reservesWind: number;
  reservesSolar: number;
  reservesThermal: number;
  reservesNuclear: number;
  windGen: number;
  solarGen: number;
  thermalGen: number;
  nuclearGen: number;
  currentOpCost: number;
  currentFuelCost: number;
  currentUnservedCost: number;
  totalOpCost: number;
  totalFuelCost: number;
  totalUnservedCost: number;
  totalCost: number;
  avgCost: number;
  totalMwh: number;
}

export type GameStatistics = GameMetrics & {
  day: number;
  timeStr: string;
  timeStep: number;
  frequency: number;
  fr_wind: number;
  fr_solar: number;
};

export interface ViewState {
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
  renderMapLabels: boolean;
  zoomSensitivity: number;
  debug_draw_map_bounds: boolean;
  keyBindings: KeyBindings;
}

export interface InputState {
  inDrag: boolean;
  dragstartX: number;
  dragstartY: number;
  dragorigX: number;
  dragorigY: number;
  hoverBranch: Branch | null;
  hoverCircuit: 1 | 2 | null;
  hoverSub: Substation | null;
}

export interface SimulationState {
  _v: number; // Mutation version — incremented on game ticks and user actions
  t: number;
  day: number;
  frequency: number;
  subs: Record<string, Substation>;
  branches: Record<string, Branch>;
  borders: number[][];
  nsubs: number;
  Ybus: math.Matrix | null;
  Yinv: math.LUDecomposition | null;
  metrics: GameMetrics;
  fr_load: number;
  fr_wind: number;
  fr_solar: number;
}

export interface GameState extends SimulationState, ViewState, InputState {}

export type InteractionHandler = (type: 'sub' | 'branch', data: Substation | Branch) => void;
export type AlertHandler = (alert: Alert, reset?: boolean) => void;
export type HintHandler = (hint: Hint, reset?: boolean) => void;

export interface Briefing {
  title: string;
  isList: boolean;
  points: string[];
}

export interface Alert {
  message: string;
  critical: boolean;
}

export interface Hint {
  message: string;
}

export type FontSize = 'sm' | 'base' | 'lg' | 'xl';

export interface AppSettings {
  viewMode: 'map' | 'tabular';
  animationsEnabled: boolean;
  renderMapLabels: boolean;
  zoomSensitivity: number;
  keyBindings: KeyBindings;
  isHighContrast: boolean;
  fontSize: FontSize;
}

export interface ResultDetails {
  performance: 'record' | 'good' | 'okay' | 'bad';
  costM: string;
  message: string;
}

export interface DayFlowState {
  targetDay: number;
  isDayFinished: boolean;
  resultDetails: ResultDetails | null;
  briefing: Briefing | null;
  isTransitioning: boolean;
}

export interface IScenario {
  readonly day: number;
  readonly briefing: Briefing;
  start(state: SimulationState, onAlert: AlertHandler | undefined, onHint: HintHandler | undefined): void;
  update(state: SimulationState, onAlert: AlertHandler | undefined, onHint: HintHandler | undefined): void;
  getResultDetails(totalCost: number): ResultDetails;
}

export type SimulationAction =
  | { type: 'TOGGLE_UNIT'; subId: string; unitIndex: number }
  | { type: 'TOGGLE_BRANCH'; branchId: string; circuitNum: 1 | 2 }
  | { type: 'SET_SETPOINT'; subId: string; unitIndex: number; value: number }
  | { type: 'DISCONNECT_SMALLEST_LOAD' }
  | { type: 'DISCONNECT_MOST_LOADED_LINE' }
  | { type: 'EMERGENCY_LOAD_SHED' }
  | { type: 'RAMP_ALL_GENERATION' };


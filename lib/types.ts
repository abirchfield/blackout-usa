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
  idx: number; // Pre-computed 0-based index: parseInt(Number) - 1
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
  fromIdx: number; // Pre-computed 0-based index: parseInt(FromNum) - 1
  toIdx: number;   // Pre-computed 0-based index: parseInt(ToNum) - 1
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
  ybr: number; // Cached -1/Z, precomputed in initGrid
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
  frWind: number;
  frSolar: number;
};

export type StatsSnapshot = GameStatistics & { blackout: boolean };

export interface ViewState {
  xmax: number;
  xmin: number;
  ymax: number;
  ymin: number;
  scaleMax: number;
  scaleMin: number;
  scaleX: number;
  scaleY: number;
  referenceScale: number;
  x0: number;
  y0: number;
  theme: 'light' | 'dark';
  animationsEnabled: boolean;
  renderMapLabels: boolean;
  zoomSensitivity: number;
  keyBindings: KeyBindings;
}

export interface InputState {
  inDrag: boolean;
  dragStartX: number;
  dragStartY: number;
  dragOrigX: number;
  dragOrigY: number;
  hoverBranch: Branch | null;
  hoverCircuit: 1 | 2 | null;
  hoverSub: Substation | null;
}

export interface SimState {
  _vSim: number; // Version counter — game ticks, dispatch actions
  t: number;
  day: number;
  frequency: number;
  subs: Record<string, Substation>;
  branches: Record<string, Branch>;
  borders: number[][];
  nsubs: number;
  referenceBus: string; // Substation Number string used as slack bus / topology root
  refIdx: number; // Pre-computed 0-based index of the reference bus substation
  Ybus: math.Matrix | null;
  Yinv: math.LUDecomposition | null;
  metrics: GameMetrics;
  frLoad: number;
  frWind: number;
  frSolar: number;
}

export interface GameState extends SimState, ViewState, InputState {}

export type InteractionHandler = (type: 'sub' | 'branch', data: Substation | Branch) => void;
export type AlertHandler = (alert: { message: string; critical: boolean }, reset?: boolean) => void;
export type HintHandler = (hint: { message: string }, reset?: boolean) => void;

export interface Briefing {
  title: string;
  isList: boolean;
  points: string[];
}

export interface Alert {
  id: number;
  time: string;
  message: string;
  critical: boolean;
}

export interface Hint {
  id: number;
  time: string;
  message: string;
}

export interface EngineSettings {
  theme?: 'light' | 'dark';
  animationsEnabled?: boolean;
  renderMapLabels?: boolean;
  zoomSensitivity?: number;
  keyBindings?: KeyBindings;
}

export interface ResultDetails {
  performance: 'record' | 'good' | 'okay' | 'bad';
  costM: string;
  message: string;
}

export interface IScenario {
  readonly day: number;
  readonly briefing: Briefing;
  start(state: SimState, onAlert: AlertHandler | undefined, onHint: HintHandler | undefined): void;
  update(state: SimState, onAlert: AlertHandler | undefined, onHint: HintHandler | undefined): void;
  getResultDetails(totalCost: number): ResultDetails;
}

// --- Case Definition Types ---

export interface MapConfig {
  bounds: { xMax: number; xMin: number; yMax: number; yMin: number };
  initialView: { x0: number; y0: number; scale: number };
}

/** Grid topology data as loaded from generated files — enum fields are plain strings.
 *  Type safety is enforced at the SimState boundary after initGrid enrichment. */
export interface RawGridData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  subs: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  branches: Record<string, any>;
  borders: number[][];
  nsubs: number;
}

export interface GridCase {
  name: string;
  referenceBus: string; // Substation Number string used as slack bus / topology root
  scenarios: Record<number, IScenario>;
  gridData: RawGridData;
  mapConfig: MapConfig;
}

export type SimulationAction =
  | { type: 'TOGGLE_UNIT'; subId: string; unitIndex: number }
  | { type: 'ABORT_UNIT_TRANSITION'; subId: string; unitIndex: number }
  | { type: 'TOGGLE_BRANCH'; branchId: string; circuitNum: 1 | 2 }
  | { type: 'SET_SETPOINT'; subId: string; unitIndex: number; value: number }
  | { type: 'DISCONNECT_SMALLEST_LOAD' }
  | { type: 'DISCONNECT_MOST_LOADED_LINE' }
  | { type: 'EMERGENCY_LOAD_SHED' }
  | { type: 'RAMP_ALL_GENERATION' };


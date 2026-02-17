import type { WeatherConfig, WeatherKey } from "$lib/weather";

export type GameAction =
  | 'PAN_UP'
  | 'PAN_DOWN'
  | 'PAN_LEFT'
  | 'PAN_RIGHT'
  | 'ZOOM_IN'
  | 'ZOOM_OUT'
  | 'RESET_ZOOM'
  | 'DISCONNECT_MOST_LOADED_LINE'
  | 'DISCONNECT_SMALLEST_LOAD'
  | 'RAMP_ALL_GENERATION_UP'
  | 'TOGGLE_PAUSE'
  | 'TOGGLE_FAST_FORWARD'
  | 'CENTER_VIEW_ON_SELECTION'
  | 'EMERGENCY_LOAD_SHED';

export type KeyBindings = Record<GameAction, string>;

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
  Pmax: number;
  Pmin: number;
  Ramp: number;
  StartTime: number;
  FixedCost: number;
  FuelCost: number;
  LoadCategory?: LoadCategoryType;
}

export interface Substation {
  Name: string;
  Number: string;
  idx: number; // Pre-computed 0-based index: parseInt(Number) - 1
  Category: SubstationCategory;
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
  // Secondary load block (present only for mixed gen+load substations)
  Loads?: { U: Unit[]; Units: number; Pmax: number; Pmin: number };
  // Pre-computed per-unit limits (Pmax/Units, Pmin/Units)
  pmax: number;
  pmin: number;
  // Pre-computed category flags
  isLoad: boolean;
  isRenewable: boolean;
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
  sibling?: string; // Number of parallel branch between same substations
  Status: BranchStatus;
  P: number;
  Pmax: number;
  Z: number;
  ybr: number; // Cached -1/Z, precomputed in initGrid
  dist?: number;
}

export interface InstantMetrics {
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
  totalGeneration: number;
  currentOpCost: number;
  currentFuelCost: number;
  currentUnservedCost: number;
}

export interface CumulativeMetrics {
  totalOpCost: number;
  totalFuelCost: number;
  totalUnservedCost: number;
  totalCost: number;
  avgCost: number;
  totalMwh: number;
}

export interface SnapshotMeta {
  day: number;
  timeStr: string;
  timeStep: number;
  frequency: number;
  windAvail: number;
  sunAvail: number;
  blackout: boolean;
}

export type StatsSnapshot = InstantMetrics & CumulativeMetrics & SnapshotMeta;

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
  hoverSub: Substation | null;
}

export interface SimState {
  _vSim: number; // Version counter — game ticks, dispatch actions
  t: number;
  frequency: number;
  subs: Record<string, Substation>;
  branches: Record<string, Branch>;
  borders: number[][];
  nsubs: number;
  referenceBus: string; // Substation Number string used as slack bus / topology root
  refIdx: number; // Pre-computed 0-based index of the reference bus substation
  // Pre-built arrays (avoid Object.values() in hot paths)
  subList: Substation[];
  genSubs: Substation[];
  loadSubs: Substation[];
  renewableSubs: Substation[];
  branchList: Branch[];
  cumulative: CumulativeMetrics;
  loadLevel: number;
  windAvail: number;
  sunAvail: number;
}

export interface GameState extends SimState, ViewState, InputState {}

export type InteractionHandler = (type: 'sub' | 'branch', data: Substation | Branch) => void;

export interface AlertInput { message: string; critical: boolean }
export interface HintInput { message: string }

export type AlertHandler = (alert: AlertInput, reset?: boolean) => void;
export type HintHandler = (hint: HintInput, reset?: boolean) => void;

export interface Alert extends AlertInput {
  id: number;
  time: string;
}

export interface Hint extends HintInput {
  id: number;
  time: string;
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

/** Common simulation model interface (LibGDX game loop pattern). */
export interface Model {
  setup(): void;
  tick(dt: number): void;
}

/** Grid simulation model — shields the engine from computational details. */
export interface GridModelApi extends Model {
  readonly state: SimState;
  readonly instant: InstantMetrics;
  reset(onAlert: AlertHandler, onHint: HintHandler): void;
  initRenewableOutput(): void;
  invalidate(): void;

  // Operator actions (user-facing: toggle semantics)
  toggleUnit(subId: string, unitIndex: number): void;
  toggleLoadUnit(subId: string, unitIndex: number): void;
  abortTransition(subId: string, unitIndex: number): void;
  toggleBranch(branchId: string): void;
  setSetpoint(subId: string, unitIndex: number, value: number): void;
  shedMinLoad(): void;
  disconnectHottestLine(): void;
  shedMaxLoad(): void;
  rampAllUp(): void;

  // Scenario mutations (scripted: force-set semantics)
  setUnitStatus(subId: string, status: UnitStatus, range?: number | { from?: number; count?: number }): void;
  tripBranch(branchId: string): void;
  randomTrips(branchIds: string[], probability: number, reason?: string): void;
  readyUnits(subId: string, range?: { from?: number; count?: number }): void;
  readyBranch(branchId: string): void;
  setUnitPower(subId: string, power: number, range?: { from?: number; count?: number }): void;

  // Notifications
  pushAlert(message: string, critical?: boolean): void;
  pushHint(message: string, reset?: boolean): void;
}

export interface CostThresholds {
  record: number;
  good: number;
  okay: number;
}

/** Weather model — independent authority for resource availability (windAvail, sunAvail, loadLevel). */
export interface WeatherModelApi {
  get(key: WeatherKey): number;
  set(key: WeatherKey, value: number): void;
  nudge(key: WeatherKey, delta: number): void;
}

export interface Scenario {
  readonly info: readonly string[];
  readonly costs: CostThresholds;
  readonly hints?: string[];
  readonly weather?: WeatherConfig;
  start?(t: number, grid: GridModelApi, weather: WeatherModelApi): void;
  update?(t: number, grid: GridModelApi, weather: WeatherModelApi): void;
}

// --- Case Definition Types ---

export interface MapConfig {
  bounds: { xMax: number; xMin: number; yMax: number; yMin: number };
  zoomMax?: number;
}

/** Grid topology data as loaded from generated JSON — all derived fields pre-computed by runme.py. */
export interface GridData {
  subs: Record<string, Substation>;
  branches: Record<string, Branch>;
  borders: number[][];
  nsubs: number;
}

export interface TimeConfig {
  startHour: number;  // 24-hour clock, e.g. 13 = 1 PM
}

export interface GridCase {
  name: string;
  referenceBus: string; // Substation Name used as slack bus / topology root
  scenarios: Record<number, Scenario>;
  gridData: GridData;
  mapConfig: MapConfig;
  timeConfig: TimeConfig;
}

import { GameMetrics, SimulationState, InputState, GameStatistics } from "./types";
import { PhysicsConfig } from "./config";

export const createInitialGameMetrics = (): GameMetrics => ({
  loadServed: 0,
  loadUnserved: 0,
  reserves: 0,
  reservesWind: 0,
  reservesSolar: 0,
  reservesThermal: 0,
  reservesNuclear: 0,
  windGen: 0,
  solarGen: 0,
  thermalGen: 0,
  nuclearGen: 0,
  currentOpCost: 0,
  currentFuelCost: 0,
  currentUnservedCost: 0,
  totalOpCost: 0,
  totalFuelCost: 0,
  totalUnservedCost: 0,
  totalCost: 0,
  avgCost: 0,
  totalMwh: 0,
});

export const createInitialGameStatistics = (): GameStatistics => ({
  ...createInitialGameMetrics(),
  day: 1,
  timeStr: "1:00 PM",
  timeStep: 0,
  frequency: PhysicsConfig.BASE_FREQUENCY,
  fr_wind: 1,
  fr_solar: 1,
});

export const createInitialSimulationState = (): SimulationState => ({
  t: 0,
  day: 1,
  frequency: PhysicsConfig.BASE_FREQUENCY,
  subs: {},
  branches: {},
  borders: [],
  nsubs: 0,
  Ybus: null,
  Yinv: null,
  metrics: createInitialGameMetrics(),
  fr_load: 1,
  fr_wind: 1,
  fr_solar: 1,
});

export const createInitialInputState = (): InputState => ({
  inDrag: false,
  dragstartX: 0,
  dragstartY: 0,
  dragorigX: 0,
  dragorigY: 0,
  hoverBranch: null,
  hoverSub: null,
});
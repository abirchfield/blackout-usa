import { GameState, GameMetrics, GameStatistics, SubstationCategory, LoadCategoryType, BranchStatus, UnitStatus } from "../types";
import { getAvailableCapacity, isVariableRenewable } from "../utils";
import { activeCase } from "@/data/cases";
import { PhysicsConfig } from "../config";

const BASE_FREQUENCY = PhysicsConfig.BASE_FREQUENCY;
const UNSERVED_LOAD_COST_PER_MW = 1000;
const MINUTES_PER_HOUR = 60.0;

// --- Factory Helpers ---

export function createInitialGameMetrics(): GameMetrics {
  return {
    loadServed: 0,
    loadUnserved: 0,
    loadServedResidential: 0,
    loadServedCommercial: 0,
    loadServedIndustrial: 0,
    loadServedDatacenter: 0,
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
  };
}

export function createInitialGameStatistics(): GameStatistics {
  return {
    ...createInitialGameMetrics(),
    day: 1,
    timeStr: "1:00 PM",
    timeStep: 0,
    frequency: BASE_FREQUENCY,
    fr_wind: 1,
    fr_solar: 1,
  };
}

// --- Grid Data Loading ---

export function loadInitialData(state: GameState) {
  const { gridData } = activeCase;
  state.subs = JSON.parse(JSON.stringify(gridData.subs));
  state.branches = JSON.parse(JSON.stringify(gridData.branches));
  state.borders = gridData.borders;
  state.nsubs = gridData.nsubs;

  for (const key in state.branches) {
    const branch = state.branches[key];
    branch.Number = key;
    branch.sub1 = state.subs[branch.FromNum];
    branch.sub2 = state.subs[branch.ToNum];

    if (branch.sub1 && branch.sub2) {
      branch.dist = Math.hypot(branch.sub1.Latitude - branch.sub2.Latitude, branch.sub1.Longitude - branch.sub2.Longitude);
    }
  }
  resetToDefaults(state);
}

export function resetToDefaults(state: GameState) {
  for (const key in state.subs) {
    const sub = state.subs[key];
    for (let iu = 0; iu < sub.Units; ++iu) {
      const u = sub.U[iu];
      u.Status = u.Status0;
      u.P = u.Pset = u.P0;
      u.StatusCount = 0;
      if (isVariableRenewable(sub.Category)) {
        u.Pset = sub.Pmax / sub.Units;
      }
    }
  }
  for (const key in state.branches) {
    const br = state.branches[key];
    br.P = 0;
    br.Status1 = BranchStatus.IN;
    br.Status2 = BranchStatus.IN;
  }

  state.t = 0;
  state.Ybus = null;
  state.Yinv = null;
  state.frequency = BASE_FREQUENCY;
  state.fr_load = 1;
  state.fr_wind = 1;
  state.fr_solar = 1;
  state.metrics = createInitialGameMetrics();
}

// --- Metrics Calculation ---

export function updateMetrics(state: GameState) {
  state.metrics.loadServed = 0;
  state.metrics.loadUnserved = 0;
  state.metrics.loadServedResidential = 0;
  state.metrics.loadServedCommercial = 0;
  state.metrics.loadServedIndustrial = 0;
  state.metrics.loadServedDatacenter = 0;
  state.metrics.windGen = 0;
  state.metrics.solarGen = 0;
  state.metrics.thermalGen = 0;
  state.metrics.nuclearGen = 0;
  state.metrics.reserves = 0;
  state.metrics.reservesWind = 0;
  state.metrics.reservesSolar = 0;
  state.metrics.reservesThermal = 0;
  state.metrics.reservesNuclear = 0;
  state.metrics.currentFuelCost = 0;
  state.metrics.currentOpCost = 0;
  state.metrics.currentUnservedCost = 0;

  for (const key in state.subs) {
    const sub = state.subs[key];
    for (let iu = 0; iu < sub.Units; ++iu) {
      const u = sub.U[iu];
      const pmax_unit = sub.Pmax / sub.Units;
      if (sub.Category === SubstationCategory.Load) {
        if (u.Status === UnitStatus.IN) {
          state.metrics.loadServed += u.P;
          if (sub.LoadCategory === LoadCategoryType.Residential) state.metrics.loadServedResidential += u.P;
          else if (sub.LoadCategory === LoadCategoryType.Commercial) state.metrics.loadServedCommercial += u.P;
          else if (sub.LoadCategory === LoadCategoryType.Industrial) state.metrics.loadServedIndustrial += u.P;
          else if (sub.LoadCategory === LoadCategoryType.Datacenter) state.metrics.loadServedDatacenter += u.P;
        } else {
          state.metrics.loadUnserved += pmax_unit * state.fr_load;
        }
      } else {
        if (u.Status === UnitStatus.IN || u.Status === UnitStatus.STARTUP || u.Status === UnitStatus.SHUTDOWN) {
          state.metrics.currentOpCost += sub.FixedCost;
          state.metrics.currentFuelCost += sub.FuelCost * u.P;
        }
        if (u.Status === UnitStatus.IN) {
          let unitReserve = 0;
          if (isVariableRenewable(sub.Category)) {
            unitReserve = getAvailableCapacity(pmax_unit, sub.Category, state.fr_wind, state.fr_solar) - u.P;
            if (sub.Category === SubstationCategory.Wind) state.metrics.reservesWind += unitReserve;
            else state.metrics.reservesSolar += unitReserve;
          } else if (sub.Category === SubstationCategory.Nuclear) {
            unitReserve = pmax_unit - u.P;
            state.metrics.reservesNuclear += unitReserve;
          } else {
            unitReserve = pmax_unit - u.P;
            state.metrics.reservesThermal += unitReserve;
          }
          state.metrics.reserves += unitReserve;
        }
        if (sub.Category === SubstationCategory.Wind) state.metrics.windGen += u.P;
        else if (sub.Category === SubstationCategory.Solar) state.metrics.solarGen += u.P;
        else if (sub.Category === SubstationCategory.Nuclear) state.metrics.nuclearGen += u.P;
        else state.metrics.thermalGen += u.P;
      }
    }
  }
  state.metrics.currentUnservedCost = state.metrics.loadUnserved * UNSERVED_LOAD_COST_PER_MW;
  state.metrics.totalFuelCost += state.metrics.currentFuelCost / MINUTES_PER_HOUR;
  state.metrics.totalOpCost += state.metrics.currentOpCost / MINUTES_PER_HOUR;
  state.metrics.totalUnservedCost += state.metrics.currentUnservedCost / MINUTES_PER_HOUR;
  state.metrics.totalCost = state.metrics.totalFuelCost + state.metrics.totalOpCost + state.metrics.totalUnservedCost;
  state.metrics.totalMwh += (state.metrics.loadServed + state.metrics.loadUnserved) / MINUTES_PER_HOUR;
  if (state.metrics.totalMwh > 0) {
    state.metrics.avgCost = state.metrics.totalCost / state.metrics.totalMwh;
  }
}

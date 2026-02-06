import { SimState, RawGridData, GameMetrics, SubstationCategory, LoadCategoryType, BranchStatus, UnitStatus } from "../types";
import { getAvailableCapacity, getUnitLimits, isVariableRenewable } from "../utils";
import { BASE_FREQUENCY, UNSERVED_COST_PER_MW, MINUTES_PER_HOUR, SHUTDOWN_THRESHOLD_MW } from "./constants";

// --- Factory Helpers ---

const ZERO_METRICS: GameMetrics = {
  loadServed: 0, loadUnserved: 0,
  loadServedResidential: 0, loadServedCommercial: 0,
  loadServedIndustrial: 0, loadServedDatacenter: 0,
  reserves: 0, reservesWind: 0, reservesSolar: 0, reservesThermal: 0, reservesNuclear: 0,
  windGen: 0, solarGen: 0, thermalGen: 0, nuclearGen: 0,
  currentOpCost: 0, currentFuelCost: 0, currentUnservedCost: 0,
  totalOpCost: 0, totalFuelCost: 0, totalUnservedCost: 0,
  totalCost: 0, avgCost: 0, totalMwh: 0,
};

// Per-tick fields that get zeroed each tick (cumulative totals are NOT in this list)
const TICK_KEYS: (keyof GameMetrics)[] = [
  'loadServed', 'loadUnserved',
  'loadServedResidential', 'loadServedCommercial', 'loadServedIndustrial', 'loadServedDatacenter',
  'windGen', 'solarGen', 'thermalGen', 'nuclearGen',
  'reserves', 'reservesWind', 'reservesSolar', 'reservesThermal', 'reservesNuclear',
  'currentFuelCost', 'currentOpCost', 'currentUnservedCost',
];

export function emptyMetrics(): GameMetrics {
  return { ...ZERO_METRICS };
}

// --- Grid Data Loading ---

export function initGrid(state: SimState, gridData: RawGridData, referenceBus: string) {
  state.subs = JSON.parse(JSON.stringify(gridData.subs));
  state.branches = JSON.parse(JSON.stringify(gridData.branches));
  state.borders = gridData.borders;
  state.nsubs = gridData.nsubs;
  state.referenceBus = referenceBus;
  state.refIdx = parseInt(referenceBus) - 1;

  for (const sub of Object.values(state.subs)) {
    sub.idx = parseInt(sub.Number) - 1;
  }

  for (const [key, br] of Object.entries(state.branches)) {
    br.Number = key;
    br.sub1 = state.subs[br.FromNum];
    br.sub2 = state.subs[br.ToNum];
    br.fromIdx = parseInt(br.FromNum) - 1;
    br.toIdx = parseInt(br.ToNum) - 1;
    br.ybr = -1 / br.Z;
    if (br.sub1 && br.sub2) {
      br.dist = Math.hypot(br.sub1.Latitude - br.sub2.Latitude, br.sub1.Longitude - br.sub2.Longitude);
    }
  }
  resetToDefaults(state);
}

export function resetToDefaults(state: SimState) {
  for (const sub of Object.values(state.subs)) {
    const { pmax } = getUnitLimits(sub);
    for (let iu = 0; iu < sub.Units; ++iu) {
      const u = sub.U[iu];
      u.Status = u.Status0;
      u.P = u.Pset = u.P0;
      u.StatusCount = 0;
      if (isVariableRenewable(sub.Category)) u.Pset = pmax;
    }
  }
  for (const br of Object.values(state.branches)) {
    br.P = 0;
    br.Status1 = BranchStatus.IN;
    br.Status2 = BranchStatus.IN;
  }

  state.t = 0;
  state.Ybus = null;
  state.Yinv = null;
  state.frequency = BASE_FREQUENCY;
  state.frLoad = 1;
  state.frWind = 1;
  state.frSolar = 1;
  state.metrics = emptyMetrics();
}

/** Set initial P and Pset for wind/solar units based on current weather fractions. */
export function initWeather(state: SimState) {
  for (const sub of Object.values(state.subs)) {
    if (sub.Category !== SubstationCategory.Wind && sub.Category !== SubstationCategory.Solar) continue;
    const { pmax } = getUnitLimits(sub);
    const fraction = sub.Category === SubstationCategory.Wind ? state.frWind : state.frSolar;
    for (let iu = 0; iu < sub.Units; ++iu) {
      sub.U[iu].P = pmax * fraction;
      sub.U[iu].Pset = pmax;
    }
  }
}

// --- Status Counter & Transition Advancement ---

/** Advance unit status counters and state machine transitions (SHUTDOWN→DIS, STARTUP→IN). */
export function advanceUnits(state: SimState) {
  for (const sub of Object.values(state.subs)) {
    const isGen = sub.Category !== SubstationCategory.Load;
    const pmin = isGen ? getUnitLimits(sub).pmin : 0;

    for (let iu = 0; iu < sub.Units; ++iu) {
      const u = sub.U[iu];
      u.StatusCount += 1;

      if (!isGen) continue;
      if (u.Status === UnitStatus.SHUTDOWN) {
        if (Math.max(u.P - sub.Ramp, 0) <= SHUTDOWN_THRESHOLD_MW) u.Status = UnitStatus.DIS;
      } else if (u.Status === UnitStatus.STARTUP) {
        if (u.StatusCount >= sub.StartTime) {
          u.Status = UnitStatus.IN;
          if (pmin > 0) u.Pset = pmin;
        }
      }
    }
  }
}

// --- Metrics Calculation ---

export function updateMetrics(state: SimState) {
  const m = state.metrics;
  for (const k of TICK_KEYS) m[k] = 0;

  for (const sub of Object.values(state.subs)) {
    const { pmax } = getUnitLimits(sub);
    const isLoad = sub.Category === SubstationCategory.Load;

    for (let iu = 0; iu < sub.Units; ++iu) {
      const u = sub.U[iu];

      if (isLoad) {
        if (u.Status === UnitStatus.IN) {
          m.loadServed += u.P;
          if (sub.LoadCategory === LoadCategoryType.Residential) m.loadServedResidential += u.P;
          else if (sub.LoadCategory === LoadCategoryType.Commercial) m.loadServedCommercial += u.P;
          else if (sub.LoadCategory === LoadCategoryType.Industrial) m.loadServedIndustrial += u.P;
          else if (sub.LoadCategory === LoadCategoryType.Datacenter) m.loadServedDatacenter += u.P;
        } else {
          m.loadUnserved += pmax * state.frLoad;
        }
        continue;
      }

      // Generator cost tracking
      if (u.Status === UnitStatus.IN || u.Status === UnitStatus.STARTUP || u.Status === UnitStatus.SHUTDOWN) {
        m.currentOpCost += sub.FixedCost;
        m.currentFuelCost += sub.FuelCost * u.P;
      }

      // Reserve calculation
      if (u.Status === UnitStatus.IN) {
        let reserve = 0;
        if (isVariableRenewable(sub.Category)) {
          reserve = getAvailableCapacity(pmax, sub.Category, state.frWind, state.frSolar) - u.P;
          if (sub.Category === SubstationCategory.Wind) m.reservesWind += reserve;
          else m.reservesSolar += reserve;
        } else if (sub.Category === SubstationCategory.Nuclear) {
          reserve = pmax - u.P;
          m.reservesNuclear += reserve;
        } else {
          reserve = pmax - u.P;
          m.reservesThermal += reserve;
        }
        m.reserves += reserve;
      }

      // Generation by type
      if (sub.Category === SubstationCategory.Wind) m.windGen += u.P;
      else if (sub.Category === SubstationCategory.Solar) m.solarGen += u.P;
      else if (sub.Category === SubstationCategory.Nuclear) m.nuclearGen += u.P;
      else m.thermalGen += u.P;
    }
  }

  m.currentUnservedCost = m.loadUnserved * UNSERVED_COST_PER_MW;
  m.totalFuelCost += m.currentFuelCost / MINUTES_PER_HOUR;
  m.totalOpCost += m.currentOpCost / MINUTES_PER_HOUR;
  m.totalUnservedCost += m.currentUnservedCost / MINUTES_PER_HOUR;
  m.totalCost = m.totalFuelCost + m.totalOpCost + m.totalUnservedCost;
  m.totalMwh += (m.loadServed + m.loadUnserved) / MINUTES_PER_HOUR;
  if (m.totalMwh > 0) m.avgCost = m.totalCost / m.totalMwh;
}

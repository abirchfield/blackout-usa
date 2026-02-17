import {
  SimState, InstantMetrics, CumulativeMetrics,
  UnitStatus, SubstationCategory, LoadCategoryType,
  AlertHandler, HintHandler,
  GridModelApi,
} from "../types";
import { availCapacity, isDispatchable, isInactive } from "../utils";
import {
  FREQUENCY_DROOP, FREQUENCY_ADJUSTMENT_THRESHOLD_MW,
  MIN_GENERATION_FOR_FREQ_STABILITY_MW, BASE_FREQUENCY, FREQUENCY_MAX,
  UNSERVED_COST_PER_MW, TICKS_PER_HOUR,
  FREQ_STEP_LARGE, FREQ_STEP_SMALL,
  FREQ_TRIP_CRITICAL_LOW, FREQ_TRIP_CRITICAL_HIGH, PROB_TRIP_FREQ_CRITICAL,
  FREQ_TRIP_LL, FREQ_TRIP_HH, PROB_TRIP_FREQ_HIGH,
  FREQ_TRIP_L, FREQ_TRIP_H, PROB_TRIP_FREQ_NORMAL,
} from "./constants";
import { NetworkModel } from "./network";
import { SubstationModel } from "./substation";

// --- Probability helpers ---

function freqTripProbability(freq: number): number {
  if (freq < FREQ_TRIP_CRITICAL_LOW || freq > FREQ_TRIP_CRITICAL_HIGH) return PROB_TRIP_FREQ_CRITICAL;
  if (freq < FREQ_TRIP_LL || freq > FREQ_TRIP_HH) return PROB_TRIP_FREQ_HIGH;
  if (freq < FREQ_TRIP_L  || freq > FREQ_TRIP_H)  return PROB_TRIP_FREQ_NORMAL;
  return 0;
}

// --- Factory helpers (exported for engine.ts initial state) ---

const ZERO_INSTANT: InstantMetrics = {
  loadServed: 0, loadUnserved: 0,
  loadServedResidential: 0, loadServedCommercial: 0,
  loadServedIndustrial: 0, loadServedDatacenter: 0,
  reserves: 0, reservesWind: 0, reservesSolar: 0, reservesThermal: 0, reservesNuclear: 0,
  windGen: 0, solarGen: 0, thermalGen: 0, nuclearGen: 0, totalGeneration: 0,
  currentOpCost: 0, currentFuelCost: 0, currentUnservedCost: 0,
};

const ZERO_CUMULATIVE: CumulativeMetrics = {
  totalOpCost: 0, totalFuelCost: 0, totalUnservedCost: 0,
  totalCost: 0, avgCost: 0, totalMwh: 0,
};

export function emptyCumulative(): CumulativeMetrics {
  return { ...ZERO_CUMULATIVE };
}

// --- Read instant metrics directly from state ---

function readInstant(state: SimState): InstantMetrics {
  const m: InstantMetrics = { ...ZERO_INSTANT };
  accumulateLoadMetrics(m, state);
  accumulateGenMetrics(m, state);
  m.totalGeneration = m.windGen + m.solarGen + m.thermalGen + m.nuclearGen;
  m.currentUnservedCost = m.loadUnserved * UNSERVED_COST_PER_MW;
  return m;
}

function accumulateLoadMetrics(m: InstantMetrics, state: SimState): void {
  for (const sub of state.subList) {
    const loadUnits = sub.isLoad ? sub.U : sub.Loads?.U;
    if (!loadUnits) continue;
    for (const u of loadUnits) {
      if (u.Status !== UnitStatus.IN) {
        m.loadUnserved += u.Pmax * state.loadLevel;
        continue;
      }
      m.loadServed += u.P;
      switch (u.LoadCategory) {
        case LoadCategoryType.Residential: m.loadServedResidential += u.P; break;
        case LoadCategoryType.Commercial:  m.loadServedCommercial += u.P; break;
        case LoadCategoryType.Industrial:  m.loadServedIndustrial += u.P; break;
        case LoadCategoryType.Datacenter:  m.loadServedDatacenter += u.P; break;
      }
    }
  }
}

function accumulateGenMetrics(m: InstantMetrics, state: SimState): void {
  for (const sub of state.genSubs) {
    for (const u of sub.U) {
      // Running units incur fixed + fuel costs
      if (u.Status === UnitStatus.IN || u.Status === UnitStatus.STARTUP || u.Status === UnitStatus.SHUTDOWN) {
        m.currentOpCost += u.FixedCost;
        m.currentFuelCost += u.FuelCost * u.P;
      }

      // Online units contribute reserves
      if (u.Status === UnitStatus.IN) {
        const cap = sub.isRenewable
          ? availCapacity(u.Pmax, sub.Category, state.windAvail, state.sunAvail)
          : u.Pmax;
        const reserve = cap - u.P;
        m.reserves += reserve;
        switch (sub.Category) {
          case SubstationCategory.Wind:    m.reservesWind += reserve; break;
          case SubstationCategory.Solar:   m.reservesSolar += reserve; break;
          case SubstationCategory.Nuclear: m.reservesNuclear += reserve; break;
          default:                         m.reservesThermal += reserve; break;
        }
      }

      // All units contribute to generation by category
      switch (sub.Category) {
        case SubstationCategory.Wind:    m.windGen += u.P; break;
        case SubstationCategory.Solar:   m.solarGen += u.P; break;
        case SubstationCategory.Nuclear: m.nuclearGen += u.P; break;
        default:                         m.thermalGen += u.P; break;
      }
    }
  }
}

// --- GridModel ---

export class GridModel implements GridModelApi {
  state!: SimState;
  private onAlert: AlertHandler = () => {};
  private onHint: HintHandler = () => {};

  private network!: NetworkModel;
  private subModels!: Record<string, SubstationModel>;
  private subModelList!: SubstationModel[];
  private genModels!: SubstationModel[];
  private loadModels!: SubstationModel[];

  // --- Metrics (computed at end of each tick) ---
  private _instant: InstantMetrics = { ...ZERO_INSTANT };
  get instant(): InstantMetrics { return this._instant; }

  // --- Lifecycle ---

  constructor(state: SimState) {
    this.state = state;
  }

  setup(): void {
    // Create SubstationModel wrappers and call their setup()
    const models: Record<string, SubstationModel> = {};
    for (const [key, sub] of Object.entries(this.state.subs)) {
      const m = new SubstationModel(sub);
      m.setup();
      models[key] = m;
    }
    this.subModels = models;

    // Build filtered model arrays (depends on setup() computed fields)
    const allModels = Object.values(models);
    this.subModelList = allModels;
    this.genModels = allModels.filter(m => !m.isLoad);
    this.loadModels = allModels.filter(m => m.isLoad);

    // Build typed substation arrays (for views / weather)
    const allSubs = Object.values(this.state.subs);
    this.state.subList = allSubs;
    this.state.genSubs = allSubs.filter(s => !s.isLoad && s.Units > 0);
    this.state.loadSubs = allSubs.filter(s => s.isLoad);
    this.state.renewableSubs = allSubs.filter(s => s.isRenewable);

    // Create and setup NetworkModel (branch enrichment + buffer alloc)
    this.network = new NetworkModel(this.state, this.subModelList, this.genModels);
    this.network.setup();
  }

  reset(onAlert: AlertHandler, onHint: HintHandler): void {
    this.onAlert = onAlert;
    this.onHint = onHint;
    this.network.setAlertHandler(onAlert);
    for (const m of this.subModelList) m.resetUnits();
    this.network.reset();
    this.state.t = 0;
    this.state.frequency = BASE_FREQUENCY;
    this.state.cumulative = emptyCumulative();
  }

  /** Set initial P and Pset for wind/solar units based on current weather availability. */
  initRenewableOutput(): void {
    const { windAvail, sunAvail, renewableSubs } = this.state;
    for (const sub of renewableSubs) {
      const fraction = sub.Category === SubstationCategory.Wind ? windAvail : sunAvail;
      for (let iu = 0; iu < sub.Units; ++iu) {
        sub.U[iu].P = sub.U[iu].Pmax * fraction;
        sub.U[iu].Pset = sub.U[iu].Pmax;
      }
    }
  }

  // NOTE TO SELF: DO NOT DELETE THE FOLLOWING NOTE
  // I intentionally designed this using the
  // LibGDX architecture that I learned nearly a decade ago
  // and I just realized, this design pattern
  // is functionally equivilent to a numeric integrator.

  tick(dt: number): void {
    // Phase 2 — Integrity: frequency trips (substations), overload trips + islands (network), unit transitions
    if (dt > 0) this.tripCheckFrequency();
    this.network.tick(dt);                              // island detection needed even at dt=0 for solver correctness
    if (dt > 0) for (const m of this.subModelList) m.tick(dt);

    // Phase 3 — Balance: prepare gen caches, set load power, compute bounds, adjust frequency
    const bal = this.prepareAndBalance();
    this.calc_frequency(bal);

    // Phase 4 — Solve: dispatch generation, DC power flow
    this.network.solve(bal.totalLoad);

    // Phase 5 — Metrics: read instant snapshot, integrate cumulative costs
    this._instant = readInstant(this.state);
    if (dt > 0) this.integrate();
  }

  /** Numeric integration: accumulate instant rates into cumulative totals. */
  private integrate(): void {
    const s = this._instant;
    const c = this.state.cumulative;
    c.totalFuelCost    += s.currentFuelCost    / TICKS_PER_HOUR;
    c.totalOpCost      += s.currentOpCost      / TICKS_PER_HOUR;
    c.totalUnservedCost += s.currentUnservedCost / TICKS_PER_HOUR;
    c.totalCost = c.totalFuelCost + c.totalOpCost + c.totalUnservedCost;
    c.totalMwh += (s.loadServed + s.loadUnserved) / TICKS_PER_HOUR;
    if (c.totalMwh > 0) c.avgCost = c.totalCost / c.totalMwh;
  }

  invalidate(): void {
    this.network.invalidate();
  }

  // --- Notifications ---

  pushAlert(message: string, critical = false): void {
    this.onAlert({ message, critical });
  }

  pushHint(message: string, reset = false): void {
    this.onHint({ message }, reset);
  }

  // --- Frequency-based Unit Trips ---

  private tripCheckFrequency() {
    const tripProb = freqTripProbability(this.state.frequency);
    if (tripProb === 0) return;

    for (const m of this.subModelList) {
      for (let i = 0; i < m.gens.length; i++) {
        if (Math.random() >= tripProb) continue;
        if (isInactive(m.gens[i].unit.Status)) continue;
        m.gens[i].forceTrip();
        this.onAlert({ message: `Generator ${m.name} #${i + 1} tripped due to frequency`, critical: true });
      }
      for (let i = 0; i < m.loads.length; i++) {
        if (Math.random() >= tripProb) continue;
        if (isInactive(m.loads[i].unit.Status)) continue;
        m.loads[i].forceTrip();
        this.onAlert({ message: `Load ${m.name} #${i + 1} tripped due to frequency`, critical: true });
      }
    }
  }

  // --- Balance (Phase 3 pipeline) ---

  /** Single pass: prepare gen caches, set load power, compute balance bounds. */
  private prepareAndBalance() {
    let totalLoad = 0, genSetpoint = 0, genMin = 0, genMax = 0;
    const { loadLevel, windAvail, sunAvail } = this.state;

    for (const m of this.subModelList) {
      // Gen part (empty loop for pure loads)
      for (const g of m.gens) g.prepare(windAvail, sunAvail);
      const c = m.genBalance();
      genSetpoint += c.setpoint;
      genMin += c.min;
      genMax += c.max;

      // Load part (empty loop for pure gens)
      for (const l of m.loads) {
        l.applyLoadPower(loadLevel);
        if (!isInactive(l.unit.Status)) totalLoad += l.unit.P;
      }
    }

    return { totalLoad, genSetpoint, genMin, genMax };
  }

  private calc_frequency({ totalLoad, genMin, genMax, genSetpoint }: { totalLoad: number; genMin: number; genMax: number; genSetpoint: number }): void {
    if (genMax < MIN_GENERATION_FOR_FREQ_STABILITY_MW) {
      this.state.frequency = 0.0;
      return;
    }

    const excess = genMin - totalLoad;   // positive = oversupply
    const deficit = totalLoad - genMax;  // positive = undersupply

    if (excess > 0) {
      // More generation than load — frequency rises
      const step = excess > FREQUENCY_ADJUSTMENT_THRESHOLD_MW ? FREQ_STEP_LARGE : FREQ_STEP_SMALL;
      this.state.frequency = Math.min(this.state.frequency + step, FREQUENCY_MAX);
    } else if (deficit > 0) {
      // More load than generation — frequency falls
      const step = deficit > FREQUENCY_ADJUSTMENT_THRESHOLD_MW ? FREQ_STEP_LARGE : FREQ_STEP_SMALL;
      this.state.frequency -= step;
    } else if (genMax > genMin) {
      // Within dispatchable range — droop toward target frequency
      const mismatch = totalLoad - genSetpoint;
      const target = BASE_FREQUENCY - FREQUENCY_DROOP * mismatch / (genMax - genMin);
      this.state.frequency += this.state.frequency < target ? FREQ_STEP_SMALL : -FREQ_STEP_SMALL;
    }
  }

  // --- Operator Actions (user-facing) ---

  toggleUnit(subId: string, unitIndex: number): void {
    this.subModels[subId]?.toggleUnit(unitIndex);
  }

  toggleLoadUnit(subId: string, unitIndex: number): void {
    this.subModels[subId]?.toggleLoadUnit(unitIndex);
  }

  abortTransition(subId: string, unitIndex: number): void {
    this.subModels[subId]?.abortTransition(unitIndex);
  }

  toggleBranch(branchId: string): void {
    this.network.toggleBranch(branchId);
  }

  setSetpoint(subId: string, unitIndex: number, value: number): void {
    this.subModels[subId]?.setSetpoint(unitIndex, value);
  }

  shedMinLoad(): void {
    const m = this.findLoadModel('smallest');
    if (!m) return;
    this.pushAlert(`Shedding smallest load: ${m.name}.`);
    m.shedAll();
  }

  disconnectHottestLine(): void {
    const result = this.network.disconnectHottestLine();
    if (result) this.pushAlert(`Disconnecting most loaded line: ${result.name1}-${result.name2}.`);
  }

  shedMaxLoad(): void {
    const m = this.findLoadModel('largest');
    if (!m) return;
    this.pushAlert(`Emergency load shed: Disconnecting largest load ${m.name}.`, true);
    m.shedAll();
  }

  rampAllUp(): void {
    this.pushAlert("Ramping all available generation to maximum.");
    for (const m of this.genModels) {
      if (!isDispatchable(m.category)) continue;
      m.forEachUnit((u, i) => {
        if (u.Status !== UnitStatus.IN) return;
        m.setSetpoint(i, m.pmax);
      });
    }
  }

  // --- Scenario Mutations (scripted) ---

  setUnitStatus(subId: string, status: UnitStatus, range?: number | { from?: number; count?: number }): void {
    this.subModels[subId]?.setUnitsStatus(status, range);
  }

  tripBranch(branchId: string): void {
    this.network.tripBranch(branchId);
  }

  randomTrips(branchIds: string[], probability: number, reason?: string): void {
    this.network.randomTrips(branchIds, probability, reason);
  }

  readyUnits(subId: string, range?: { from?: number; count?: number }): void {
    this.subModels[subId]?.readyUnits(range);
  }

  readyBranch(branchId: string): void {
    this.network.readyBranch(branchId);
  }

  setUnitPower(subId: string, power: number, range?: { from?: number; count?: number }): void {
    this.subModels[subId]?.setUnitPower(power, range);
  }

  // --- Private helpers ---

  private findLoadModel(compare: 'smallest' | 'largest'): SubstationModel | null {
    let best: SubstationModel | null = null;
    let bestPmax = compare === 'smallest' ? Infinity : -1;

    for (const m of this.loadModels) {
      if (!m.hasUnitWithStatus(UnitStatus.IN)) continue;
      const better = compare === 'smallest' ? m.totalPmax < bestPmax : m.totalPmax > bestPmax;
      if (!better) continue;
      bestPmax = m.totalPmax;
      best = m;
    }
    return best;
  }
}

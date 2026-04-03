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
import { GridMutationError } from "./errors";

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
  capacityNuclear: 0, capacityThermal: 0, capacitySolar: 0, capacityWind: 0, totalCapacity: 0,
  currentOpCost: 0, currentFuelCost: 0, currentUnservedCost: 0,
};

const ZERO_CUMULATIVE: CumulativeMetrics = {
  totalOpCost: 0, totalFuelCost: 0, totalUnservedCost: 0,
  totalCost: 0, avgCost: 0, totalMwh: 0,
};

/** Create a zeroed CumulativeMetrics object. */
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
    // Resolve category bucket once per substation (constant across all units)
    const cat = sub.Category;
    const isWind = cat === SubstationCategory.Wind;
    const isSolar = cat === SubstationCategory.Solar;
    const isNuclear = cat === SubstationCategory.Nuclear;

    for (const u of sub.U) {
      const cap = sub.isRenewable
        ? availCapacity(u.Pmax, cat, state.windAvail, state.sunAvail)
        : u.Pmax;

      // Capacity by type (all units regardless of status)
      if (isWind) m.capacityWind += cap;
      else if (isSolar) m.capacitySolar += cap;
      else if (isNuclear) m.capacityNuclear += cap;
      else m.capacityThermal += cap;

      // Running units incur fixed + fuel costs
      if (u.Status === UnitStatus.IN || u.Status === UnitStatus.STARTUP || u.Status === UnitStatus.SHUTDOWN) {
        m.currentOpCost += u.FixedCost;
        m.currentFuelCost += u.FuelCost * u.P;
      }

      // Online units contribute reserves
      if (u.Status === UnitStatus.IN) {
        const reserve = cap - u.P;
        m.reserves += reserve;
        if (isWind) m.reservesWind += reserve;
        else if (isSolar) m.reservesSolar += reserve;
        else if (isNuclear) m.reservesNuclear += reserve;
        else m.reservesThermal += reserve;
      }

      // Generation by category
      if (isWind) m.windGen += u.P;
      else if (isSolar) m.solarGen += u.P;
      else if (isNuclear) m.nuclearGen += u.P;
      else m.thermalGen += u.P;
    }
  }
  m.totalCapacity = m.capacityNuclear + m.capacityThermal + m.capacitySolar + m.capacityWind;
}

// --- GridModel ---

/** Grid simulation model: owns substations, network solver, and tick-level metrics. */
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

  /** Initialize substation/network models and build typed arrays from state. */
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

  /** Reset all units and network to initial state for a new day. */
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

  // Architecture: the setup()/tick()/reset() lifecycle mirrors LibGDX's game loop pattern,
  // which is functionally equivalent to a numeric integrator.

  /** Run one simulation step: integrity checks, balance, DC power flow, metrics. */
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

  /** Mark network topology as dirty (forces Ybus rebuild on next solve). */
  invalidate(): void {
    this.network.invalidate();
  }

  // --- Notifications ---

  /** Send an alert to the engine's notification handler. */
  pushAlert(message: string, critical = false): void {
    this.onAlert({ message, critical });
  }

  /** Send a hint to the engine's notification handler. */
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
      // Gradual decay: less generation = faster collapse, giving the player a few ticks to react
      const severity = 1 - (genMax / MIN_GENERATION_FOR_FREQ_STABILITY_MW);
      this.state.frequency -= FREQ_STEP_LARGE * (1 + severity * 4);
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
    } else {
      // genMax === genMin, no droop range — nudge toward nominal
      if (this.state.frequency < BASE_FREQUENCY) this.state.frequency += FREQ_STEP_SMALL;
      else if (this.state.frequency > BASE_FREQUENCY) this.state.frequency -= FREQ_STEP_SMALL;
    }

    // Last defense: if anything upstream produced NaN/Infinity, collapse to zero
    if (!Number.isFinite(this.state.frequency)) {
      this.state.frequency = 0;
    }
  }

  // --- Operator Actions (user-facing) ---

  /** Toggle a generator unit between startup and shutdown. */
  toggleUnit(subId: string, unitIndex: number): void {
    this.requireSubModel(subId, 'toggleUnit').toggleUnit(unitIndex);
  }

  /** Toggle a load unit between connected and disconnected. */
  toggleLoadUnit(subId: string, unitIndex: number): void {
    this.requireSubModel(subId, 'toggleLoadUnit').toggleLoadUnit(unitIndex);
  }

  /** Cancel an in-progress startup or shutdown for a generator unit. */
  abortTransition(subId: string, unitIndex: number): void {
    this.requireSubModel(subId, 'abortTransition').abortTransition(unitIndex);
  }

  /** Open or close a transmission branch. */
  toggleBranch(branchId: string): void {
    this.requireBranch(branchId, 'toggleBranch');
    this.network.toggleBranch(branchId);
  }

  /** Set a generator's target power output. */
  setSetpoint(subId: string, unitIndex: number, value: number): void {
    this.requireSubModel(subId, 'setSetpoint').setSetpoint(unitIndex, value);
  }

  /** Disconnect the smallest active load substation. */
  shedMinLoad(): void {
    const m = this.findLoadModel('smallest');
    if (!m) return;
    this.pushAlert(`Shedding smallest load: ${m.name}.`);
    m.shedAll();
  }

  /** Open the most heavily loaded branch (and its sibling circuit). */
  disconnectHottestLine(): void {
    const result = this.network.disconnectHottestLine();
    if (result) this.pushAlert(`Disconnecting most loaded line: ${result.name1}-${result.name2}.`);
  }

  /** Emergency: disconnect the largest active load substation. */
  shedMaxLoad(): void {
    const m = this.findLoadModel('largest');
    if (!m) return;
    this.pushAlert(`Emergency load shed: Disconnecting largest load ${m.name}.`, true);
    m.shedAll();
  }

  /** Set all dispatchable generators to maximum output. */
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

  /** Set unit status for scenario scripting (single index or range). */
  setUnitStatus(subId: string, status: UnitStatus, range?: number | { from?: number; count?: number }): void {
    this.requireSubModel(subId, 'setUnitStatus').setUnitsStatus(status, range);
  }

  /** Force-trip a branch (scenario scripting). */
  tripBranch(branchId: string): void {
    this.requireBranch(branchId, 'tripBranch');
    this.network.tripBranch(branchId);
  }

  /** Randomly trip branches by probability (scenario scripting). */
  randomTrips(branchIds: string[], probability: number, reason?: string): void {
    for (const id of branchIds) this.requireBranch(id, 'randomTrips');
    this.network.randomTrips(branchIds, probability, reason);
  }

  /** Move tripped units to out-of-service so they can be manually restarted. */
  readyUnits(subId: string, range?: { from?: number; count?: number }): void {
    this.requireSubModel(subId, 'readyUnits').readyUnits(range);
  }

  /** Move a tripped branch to out-of-service (allows manual re-close). */
  readyBranch(branchId: string): void {
    this.requireBranch(branchId, 'readyBranch');
    this.network.readyBranch(branchId);
  }

  /** Directly set unit power output (scenario scripting). */
  setUnitPower(subId: string, power: number, range?: { from?: number; count?: number }): void {
    this.requireSubModel(subId, 'setUnitPower').setUnitPower(power, range);
  }

  // --- Private helpers ---

  private requireSubModel(subId: string, op: string): SubstationModel {
    const model = this.subModels[subId];
    if (!model) throw new GridMutationError(op, subId);
    return model;
  }

  private requireBranch(branchId: string, op: string): void {
    if (!this.state.branches[branchId]) {
      throw new GridMutationError(op, branchId);
    }
  }

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

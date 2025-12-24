import { Substation, Branch, GameStatistics, GameState, GameMetrics, InteractionHandler, AlertHandler, HintHandler, Briefing, UnitStatus, BranchStatus, SubstationCategory, Unit } from "./types";
import { scenario_data } from "./scenario_data";
import { GameDrawer } from "./canvas/drawer";
import { GameHandler } from "./canvas/handler";
import { scenarios, IScenario, ResultDetails } from "./scenarios";
import * as math from "mathjs"; 

// --- Physics Constants ---
const BASE_FREQUENCY = 60.0;
const POWER_FLOW_BASE_MW = 100.0;
const UNSERVED_LOAD_COST_PER_MW = 1000;
const MINUTES_PER_HOUR = 60.0;
const POWER_BALANCE_MAX_ITERATIONS = 10;
const FREQUENCY_ADJUSTMENT_DROOP = 0.2;
const FREQUENCY_ADJUSTMENT_THRESHOLD = 500;
const MIN_GENERATION_BASE_FOR_FREQ_STABILITY = 5;

// --- Frequency Tripping ---
const FREQ_TRIP_CRITICAL_LOW = 57;
const FREQ_TRIP_CRITICAL_HIGH = 63;
const PROB_TRIP_FREQ_CRITICAL = 0.05;
const FREQ_TRIP_HIGH_LOW = 59;
const FREQ_TRIP_HIGH_HIGH = 61;
const PROB_TRIP_FREQ_HIGH = 0.01;
const FREQ_TRIP_NORMAL_LOW = 59.3;
const FREQ_TRIP_NORMAL_HIGH = 60.7;
const PROB_TRIP_FREQ_NORMAL = 0.001;

// --- Overload Tripping ---
const OVERLOAD_TRIP_CRITICAL_MULTIPLIER = 1.5;
const PROB_TRIP_OVERLOAD_CRITICAL = 0.05;
const OVERLOAD_TRIP_NORMAL_MULTIPLIER = 1.2;
const PROB_TRIP_OVERLOAD_NORMAL = 0.01;

// --- Island Detection ---
const ROOT_BUS_NAME = "Bryan";
const ROOT_ISLAND_ID = 0;
const UNASSIGNED_ISLAND_ID = -1;
const REFERENCE_BUS_NUMBER_STR = "6";
const REFERENCE_BUS_ADMITTANCE = 10000;

// --- Power Balance & Dispatch ---
const GENERATION_SHUTDOWN_THRESHOLD_MW = 1;
const POWER_BALANCE_ALPHA_MIN = -1;
const POWER_BALANCE_ALPHA_MAX = 1;

// --- Game Configuration ---
const INITIAL_VIEW_X0 = -105; // Fallback initial X, will be overwritten by drawer
const INITIAL_VIEW_Y0 = 36;   // Fallback initial Y, will be overwritten by drawer
const INITIAL_SCALE = 50;     // Fallback initial scale, will be overwritten by drawer
const VIEW_SCALE_ADJUST = 0.25;
const MAP_BOUNDS_XMAX = -92;  // Map's rightmost longitude
const MAP_BOUNDS_XMIN = -107; // Map's leftmost longitude
const MAP_BOUNDS_YMAX = 37;   // Map's topmost latitude
const MAP_BOUNDS_YMIN = 25;   // Map's bottommost latitude
const ZOOM_LIMIT_MAX = 500;
// ZOOM_LIMIT_MIN is now dynamically set by GameDrawer.
const MAX_UNIT_SETPOINT = 10000;

export class GameEngine {
  private drawer: GameDrawer;
  private handler: GameHandler;
  private currentScenario: IScenario | null = null;
  private isViewInitialized = false;
  public static readonly GAME_DURATION = 600;
  
  // Simulation State (formerly G)
  public state: GameState = {
    // Game Loop Vars
    anim_cycle_state: 0,
    scale_adjust: VIEW_SCALE_ADJUST,
    xmax: MAP_BOUNDS_XMAX,
    xmin: MAP_BOUNDS_XMIN,
    ymax: MAP_BOUNDS_YMAX,
    ymin: MAP_BOUNDS_YMIN,
    scale_max: ZOOM_LIMIT_MAX,
    scale_min: 0, // Will be set dynamically by drawer
    t: 0,
    day: 1,
    frequency: BASE_FREQUENCY,
    scaleX: INITIAL_SCALE, // Fallback, will be overwritten by drawer
    scaleY: INITIAL_SCALE, // Fallback, will be overwritten by drawer
    x0: INITIAL_VIEW_X0,     // Fallback, will be overwritten by drawer
    y0: INITIAL_VIEW_Y0,     // Fallback, will be overwritten by drawer
    theme: 'dark',
    
    // Input State
    inDrag: false,
    dragstartX: 0,
    dragstartY: 0,
    dragorigX: 0,
    dragorigY: 0,
    hoverBranch: null as Branch | null,
    hoverSub: null as Substation | null,

    // Data
    subs: {} as Record<string, Substation>,
    branches: {} as Record<string, Branch>,
    borders: [] as number[][],
    nsubs: 0,
    Ybus: null as math.Matrix | null,
    Yinv: null as math.LUDecomposition | null,
    
    metrics: {
      loadServed: 0, 
      loadUnserved: 0, 
      reserves: 0,
      windGen: 0,
      solarGen: 0,
      thermalGen: 0,
      nuclearGen: 0,
      currentFuelCost: 0,
      currentOpCost: 0,
      currentUnservedCost: 0,
      totalFuelCost: 0,
      totalOpCost: 0,
      totalUnservedCost: 0,
      totalCost: 0,
      avgCost: 0,
      totalMwh: 0,
    },
    // Physics factors
    fr_load: 1,
    fr_wind: 1,
    fr_solar: 1,
  };

  constructor(canvas: HTMLCanvasElement) {
    this.drawer = new GameDrawer(canvas);
    this.handler = new GameHandler(canvas, this.state, () => this.draw());
    
    this.init();
  }

  set onInteract(handler: InteractionHandler | undefined) {
    this.handler.onInteract = handler;
  }

  get onInteract() {
    return this.handler.onInteract;
  }

  public onAlert?: AlertHandler;
  public onHint?: HintHandler;

  public setTheme(theme: 'light' | 'dark') {
    if (this.state.theme !== theme) {
      this.state.theme = theme;
      this.draw(); // Redraw with the new theme
    }
  }

  private init() {
    // Deep copy scenario data to prevent mutation of the original data module.
    // This ensures that each game instance starts with a fresh, unmodified state.
    this.state.subs = JSON.parse(JSON.stringify(scenario_data.subs));
    this.state.branches = JSON.parse(JSON.stringify(scenario_data.branches));
    this.state.borders = scenario_data.borders;
    this.state.nsubs = scenario_data.nsubs;

    // Link branches to substations 
    for (const key in this.state.branches) {
      const branch = this.state.branches[key];
      branch.sub1 = this.state.subs[branch.FromNum];
      branch.sub2 = this.state.subs[branch.ToNum];

      // Unused?
      if (branch.sub1 && branch.sub2) {
        branch.dist = Math.hypot(branch.sub1.Latitude - branch.sub2.Latitude, branch.sub1.Longitude - branch.sub2.Longitude);
      }
    }
    this.setDefaults();
  }

  public setDefaults(resetView = true) { // Added resetView parameter
    // Reset units
    for (const key in this.state.subs) {
      const sub = this.state.subs[key];
      for (let iu = 0; iu < sub.Units; ++iu) {
        const u = sub.U[iu];
        u.Status = u.Status0;
        u.P = u.Pset = u.P0;
        u.StatusCount = 0;
        if (sub.Category === SubstationCategory.Solar || sub.Category === SubstationCategory.Wind) {
          u.Pset = sub.Pmax / sub.Units;
        }
      }
    }
    // Reset branches
    for (const key in this.state.branches) {
      const br = this.state.branches[key];
      br.P = 0;
      br.Status1 = BranchStatus.IN;
      br.Status2 = BranchStatus.IN;
    }
    if (resetView) {
      // Flag the view to be re-initialized by the drawer on the next frame.
      this.isViewInitialized = false;
    }
    
    // Reset Game State
    this.state.t = 0;
    this.state.Ybus = null;
    this.state.Yinv = null;
    this.state.frequency = BASE_FREQUENCY;
    this.state.fr_load = 1;
    this.state.fr_wind = 1;
    this.state.fr_solar = 1;

    // Reset Metrics
    this.state.metrics = {
      loadServed: 0,
      loadUnserved: 0,
      windGen: 0,
      solarGen: 0,
      thermalGen: 0,
      nuclearGen: 0,
      reserves: 0,
      currentFuelCost: 0,
      currentOpCost: 0,
      currentUnservedCost: 0,
      totalFuelCost: 0,
      totalOpCost: 0,
      totalUnservedCost: 0,
      totalCost: 0,
      avgCost: 0,
      totalMwh: 0,
    };
  }

  public startDay(day: number) {
    this.setDefaults(false); // Don't reset view when starting a new day, only game state
    this.state.day = day;
    
    this.currentScenario = scenarios[day] || null;
    if (this.currentScenario) {
      this.currentScenario.start(this.state, this.onAlert, this.onHint);
    } else {
      // Default behavior or error for undefined day
      this.onAlert?.({ message: `Scenario for Day ${day} is not defined.`, critical: true }, true);
    }

    // Common setup for all days after day-specific changes
    for (const key in this.state.subs) {
        const sub = this.state.subs[key];
        for (let iu = 0 ; iu < sub.Units; ++iu) {
            const u = sub.U[iu];
            const pmax = sub.Pmax / sub.Units;
            if (sub.Category === SubstationCategory.Wind) {
                u.P = pmax * this.state.fr_wind;
                u.Pset = pmax;
            }
            else if (sub.Category === SubstationCategory.Solar) {
                u.P = pmax * this.state.fr_solar;
                u.Pset = pmax;
            }
        }
    }
  }
  
  public getCurrentScenarioBriefing(): Briefing | null {
    return this.currentScenario?.briefing || null;
  }

  public getBriefingForDay(day: number): Briefing | null {
    const scenario = scenarios[day] || null;
    return scenario?.briefing || null;
  }

  public getResultsForDay(day: number, totalCost: number): ResultDetails | null {
    const scenario = scenarios[day];
    if (scenario) {
        return scenario.getResultDetails(totalCost);
    }
    return null;
  }

  public toggleUnitStatus(subId: string, unitIndex: number) {
    const sub = this.state.subs[subId];
    if (!sub) return;
    const u = sub.U[unitIndex];
    if (!u) return;

    // Logic from sub_click1 in script.js
    if (sub.Category === SubstationCategory.Load) {
        if (u.Status === UnitStatus.DIS) u.Status = UnitStatus.IN;
        else if (u.Status === UnitStatus.IN) u.Status = UnitStatus.DIS;
    } else {
        if (u.Status === UnitStatus.DIS) {
            u.Status = UnitStatus.STARTUP;
            u.StatusCount = 0;
        } else if (u.Status === UnitStatus.IN || u.Status === UnitStatus.STARTUP) {
            u.Status = UnitStatus.SHUTDOWN;
            u.StatusCount = 0;
        }
    }
    this.state.Ybus = null; // Invalidate Ybus
    this.draw();
  }

  public toggleBranchCircuitStatus(branchId: string, circuitNum: 1 | 2) {
      const branch = this.state.branches[branchId];
      if (!branch) return;

      if (circuitNum === 1 && branch.Status1 !== BranchStatus.TRIP) {
          branch.Status1 = branch.Status1 === BranchStatus.IN ? BranchStatus.DIS : BranchStatus.IN;
      } else if (circuitNum === 2 && branch.Circuits === 2 && branch.Status2 !== BranchStatus.TRIP) {
          branch.Status2 = branch.Status2 === BranchStatus.IN ? BranchStatus.DIS : BranchStatus.IN;
      }
      this.state.Ybus = null; // Invalidate Ybus
      this.draw();
  }

  public setUnitSetpoint(subId: string, unitIndex: number, newSetpoint: number) {
    const sub = this.state.subs[subId];
    if (!sub || !sub.U[unitIndex]) return;
    if (!isNaN(newSetpoint)) {
      const pmax_unit = sub.Pmax / sub.Units;
      const pmin_unit = sub.Pmin / sub.Units;
      // Clamp the setpoint to the unit's operational limits for robustness.
      const clampedSetpoint = Math.max(pmin_unit, Math.min(pmax_unit, newSetpoint));
      sub.U[unitIndex].Pset = clampedSetpoint;
    }
  }

  public update(steps = 1): boolean {
    for (let i = 0; i < steps; i++) {
      if (this.runGameStep()) {
        return true; // Day is over
      }
    }
    return false; // Day is not over
  }

  private runGameStep(): boolean {
    if (this.state.t >= GameEngine.GAME_DURATION) {
      this.state.Ybus = null;
      return true; // Day finished
    }

    this.state.t += 1;

    this.currentScenario?.update(this.state, this.onAlert, this.onHint);

    this._handleContingencies();
    this._updateGridTopology();
    
    const { PL, PGSET, PGMIN, PGMAX } = this._calculatePowerBalance();
    
    this._updateFrequency(PL, PGMIN, PGMAX, PGSET);
    
    const alpha = this._dispatchGeneration(PL);
    
    this._runPowerFlow(alpha);
    
    this._updateMetrics();

    return false; // Day not finished
  }

  private _handleContingencies() {
    // Frequency-based tripping
    const freq = this.state.frequency;
    let freq_prob_trip = 0;
    if (freq < FREQ_TRIP_CRITICAL_LOW || freq > FREQ_TRIP_CRITICAL_HIGH) freq_prob_trip = PROB_TRIP_FREQ_CRITICAL;
    else if (freq < FREQ_TRIP_HIGH_LOW || freq > FREQ_TRIP_HIGH_HIGH) freq_prob_trip = PROB_TRIP_FREQ_HIGH;
    else if (freq < FREQ_TRIP_NORMAL_LOW || freq > FREQ_TRIP_NORMAL_HIGH) freq_prob_trip = PROB_TRIP_FREQ_NORMAL;

    if (freq_prob_trip > 0) {
        for (const key in this.state.subs) {
            const sub = this.state.subs[key];
            for (let iu = 0; iu < sub.Units; ++iu) {
                if (Math.random() < freq_prob_trip) {
                    const u = sub.U[iu];
                    if (u.Status === UnitStatus.IN || u.Status === UnitStatus.STARTUP || u.Status === UnitStatus.SHUTDOWN) {
                        u.Status = UnitStatus.TRIP;
                        u.P = 0;
                        u.Pset = 0;                        this.onAlert?.({ message: `${sub.Category === SubstationCategory.Load ? "Load" : "Generator"} ${sub.Name} #${iu + 1} tripped due to frequency`, critical: true });
                        this.state.Ybus = null;
                    }
                }
            }
        }
    }

    // Overload-based tripping
    for (const key in this.state.branches) {
        const br = this.state.branches[key];
        let overload_prob_trip = 0;
        if (Math.abs(br.P) > br.Pmax * br.Circuits * OVERLOAD_TRIP_CRITICAL_MULTIPLIER) overload_prob_trip = PROB_TRIP_OVERLOAD_CRITICAL;
        else if (Math.abs(br.P) > br.Pmax * br.Circuits * OVERLOAD_TRIP_NORMAL_MULTIPLIER) overload_prob_trip = PROB_TRIP_OVERLOAD_NORMAL;

        if (Math.random() < overload_prob_trip) {
            if (br.Status1 === BranchStatus.IN || br.Status2 === BranchStatus.IN) {
                br.Status1 = BranchStatus.TRIP;
                br.Status2 = BranchStatus.TRIP;
                this.onAlert?.({ message: `Branch ${br.sub1?.Name}-${br.sub2?.Name} tripped on overloading!`, critical: true });
                this.state.Ybus = null;
            }
        }
    }
  }

  private _updateGridTopology() {
    // Check for connected topology
    for (const key in this.state.subs) {
        const sub = this.state.subs[key];
        sub.island = UNASSIGNED_ISLAND_ID;
        if (sub.Name === ROOT_BUS_NAME) sub.island = ROOT_ISLAND_ID;
    }

    let changed_something = true;
    while (changed_something) {
        changed_something = false;
        for (const key in this.state.branches) {
            const br = this.state.branches[key];
            if (br.Status1 !== BranchStatus.IN && (br.Status2 !== BranchStatus.IN || br.Circuits === 1)) continue;
            if (br.sub1?.island !== br.sub2?.island && br.sub1 && br.sub2) {
                if (br.sub1.island === ROOT_ISLAND_ID || br.sub2.island === ROOT_ISLAND_ID) {
                    br.sub1.island = ROOT_ISLAND_ID;
                    br.sub2.island = ROOT_ISLAND_ID;
                    changed_something = true;
                }
            }
        }
    }

    // Trip anything not connected to the root
    for (const key in this.state.subs) {
        const sub = this.state.subs[key];
        if (sub.island === UNASSIGNED_ISLAND_ID) {
            for (let iu = 0; iu < sub.Units; ++iu) {
                const u = sub.U[iu];
                if (u.Status === UnitStatus.IN || u.Status === UnitStatus.SHUTDOWN || u.Status === UnitStatus.STARTUP) {
                    u.Status = UnitStatus.TRIP;
                    u.P = 0;
                    u.Pset = 0;
                    const type = sub.Category === SubstationCategory.Load ? "Load" : "Generator";
                    this.onAlert?.({ message: `${type} ${sub.Name} #${iu + 1} tripped due to separation from grid`, critical: true });
                }
            }
        }
    }
  }

  private _calculatePowerBalance() {
    let PL = 0, PGSET = 0, PGMIN = 0, PGMAX = 0;
    for (const key in this.state.subs) {
        const sub = this.state.subs[key];
        for (let iu = 0; iu < sub.Units; ++iu) {
            const u = sub.U[iu];
            const pmax = sub.Pmax / sub.Units;
            const pmin = sub.Pmin / sub.Units;
            u.StatusCount += 1;

            let tempset = this._calculateUnitTempset(u, sub);
            if (u.Status === UnitStatus.DIS || u.Status === UnitStatus.TRIP) continue;
            if (sub.Category === SubstationCategory.Load) {
                PL += pmax * this.state.fr_load;
            } else if (u.Status === UnitStatus.SHUTDOWN) {
                PGMIN += Math.max(0, u.P - sub.Ramp);
                PGMAX += Math.max(0, u.P - sub.Ramp);
                PGSET += Math.max(0, u.P - sub.Ramp);
            } else if (sub.Category === SubstationCategory.Wind) {
                const pavail = pmax * this.state.fr_wind;
                if (tempset > pavail) tempset = pavail;
                PGMIN += Math.max(u.P - sub.Ramp, 0);
                PGMAX += Math.min(u.P + sub.Ramp, pavail);
                PGSET += tempset;
            } else if (sub.Category === SubstationCategory.Solar) {
                const pavail = pmax * this.state.fr_solar;
                if (tempset > pavail) tempset = pavail;
                PGMIN += Math.max(u.P - sub.Ramp, 0);
                PGMAX += Math.min(u.P + sub.Ramp, pavail);
                PGSET += tempset;
            } else {
                if (u.Status === UnitStatus.STARTUP) {
                    if (u.StatusCount >= sub.StartTime) {
                        PGMIN += Math.min(u.P + sub.Ramp, Math.max(pmin, u.P - sub.Ramp));
                        PGMAX += Math.min(pmax, u.P + sub.Ramp);
                        PGSET += tempset;
                    }
                } else {
                    PGMIN += Math.max(pmin, u.P - sub.Ramp);
                    PGMAX += Math.min(pmax, u.P + sub.Ramp);
                    PGSET += tempset;
                }
            }
        }
    }
    return { PL, PGSET, PGMIN, PGMAX };
  }

  private _updateFrequency(PL: number, PGMIN: number, PGMAX: number, PGSET: number) {
    if (PGMAX < MIN_GENERATION_BASE_FOR_FREQ_STABILITY) {
        this.state.frequency = 0.0;
    } else if (PL <= PGMIN) {
        this.state.frequency += (PL - PGMIN < -FREQUENCY_ADJUSTMENT_THRESHOLD) ? 0.05 : 0.01;
    } else if (PL >= PGMAX) {
        this.state.frequency -= (PL - PGMAX > FREQUENCY_ADJUSTMENT_THRESHOLD) ? 0.05 : 0.01;
    } else {
        if (PGMAX > PGMIN) {
            const PMAKE = PL - PGSET;
            const ftarg = BASE_FREQUENCY - FREQUENCY_ADJUSTMENT_DROOP * PMAKE / (PGMAX - PGMIN);
            if (this.state.frequency < ftarg) this.state.frequency += 0.01;
            else this.state.frequency -= 0.01;
        }
    }
  }

  private _dispatchGeneration(PL: number): number {
    // Set load P values
    for (const key in this.state.subs) {
        const sub = this.state.subs[key];
        for (let iu = 0; iu < sub.Units; ++iu) {
            const u = sub.U[iu];
            if (sub.Category === SubstationCategory.Load && u.Status === UnitStatus.IN) {
                u.P = (sub.Pmax / sub.Units) * this.state.fr_load;
            } else if (u.Status === UnitStatus.DIS || u.Status === UnitStatus.TRIP) {
                u.P = 0;
            }
        }
    }

    // Iterate to find generator P values (alpha iteration)
    let alpha0 = POWER_BALANCE_ALPHA_MIN, alpha1 = POWER_BALANCE_ALPHA_MAX, alpha = 0;
    for(let iter = 0; iter < POWER_BALANCE_MAX_ITERATIONS; iter++) { // Limit iterations
        let PBAL = PL;
        alpha = 0.5 * (alpha0 + alpha1);
        for (const key in this.state.subs) {
            const sub = this.state.subs[key];
            if (sub.Category === SubstationCategory.Load) continue;
            for (let iu = 0; iu < sub.Units; ++iu) {
                const u = sub.U[iu];
                if (u.Status === UnitStatus.DIS || u.Status === UnitStatus.TRIP) continue;
                
                const pmax = sub.Pmax / sub.Units;
                const pmin = sub.Pmin / sub.Units;

                let tempset = this._calculateUnitTempset(u, sub);
                let tryp = 0;

                if (u.Status === UnitStatus.SHUTDOWN) {
                    tryp = Math.max(u.P - sub.Ramp, 0);
                } else if (sub.Category === SubstationCategory.Wind) {
                    const pavail = pmax * this.state.fr_wind;
                    if (tempset > pavail) tempset = pavail;
                    tryp = Math.max(0, Math.min(pavail, u.P + sub.Ramp, tempset + alpha * pmax));
                } else if (sub.Category === SubstationCategory.Solar) {
                    const pavail = pmax * this.state.fr_solar;
                    if (tempset > pavail) tempset = pavail;
                    tryp = Math.max(0, Math.min(pavail, u.P + sub.Ramp, tempset + alpha * pmax));
                } else { // Thermal, Nuclear
                    if (u.Status === UnitStatus.STARTUP && u.StatusCount >= sub.StartTime) {
                        tryp = Math.max(pmin, Math.min(pmax, u.P + sub.Ramp, tempset + alpha * pmax));
                    } else if (u.Status === UnitStatus.IN) {
                        tryp = Math.max(pmin, Math.min(pmax, u.P + sub.Ramp, tempset + alpha * pmax));
                    }
                }
                PBAL -= tryp;
            }
        }
        if (PBAL > 0) alpha0 = alpha;
        else alpha1 = alpha;
    }
    return alpha;
  }

  private _runPowerFlow(alpha: number) {
    // Final pass to set generator P values and build power vector
    const pvec = math.zeros(this.state.nsubs, 1) as math.Matrix;
    for (const key in this.state.subs) {
        const sub = this.state.subs[key];
        const i = parseInt(sub.Number) - 1;
        let subPower = 0;
        for (let iu = 0; iu < sub.Units; ++iu) {
            const u = sub.U[iu];
            if (u.Status === UnitStatus.DIS || u.Status === UnitStatus.TRIP) {
                u.P = 0;
                continue;
            }

            const pmax = sub.Pmax / sub.Units;
            const pmin = sub.Pmin / sub.Units;
            
            let tempset = this._calculateUnitTempset(u, sub);
            let tryp = 0;

            if (sub.Category === SubstationCategory.Load) {
                subPower -= u.P;
                continue;
            } else if (u.Status === UnitStatus.SHUTDOWN) {
                tryp = Math.max(u.P - sub.Ramp, 0);
                if (tryp <= GENERATION_SHUTDOWN_THRESHOLD_MW) u.Status = UnitStatus.DIS;
            } else if (sub.Category === SubstationCategory.Wind) {
                const pavail = pmax * this.state.fr_wind;
                if (tempset > pavail) tempset = pavail;
                tryp = Math.max(0, Math.min(pavail, u.P + sub.Ramp, tempset + alpha * pmax));
            } else if (sub.Category === SubstationCategory.Solar) {
                const pavail = pmax * this.state.fr_solar;
                if (tempset > pavail) tempset = pavail;
                tryp = Math.max(0, Math.min(pavail, u.P + sub.Ramp, tempset + alpha * pmax));
            } else { // Thermal, Nuclear
                if (u.Status === UnitStatus.IN || (u.Status === UnitStatus.STARTUP && u.StatusCount >= sub.StartTime)) {
                    tryp = Math.max(pmin, Math.min(pmax, u.P + sub.Ramp, tempset + alpha * pmax));
                }
            }

            if (u.Status === UnitStatus.STARTUP) {
                if (u.StatusCount >= sub.StartTime) { 
                    if (tryp >= pmin) {
                        u.Status = UnitStatus.IN;
                        if (pmin > 0) { // For thermal/nuclear, setpoint defaults to pmin. For renewables, it's preserved.
                            u.Pset = pmin;
                        }
                    }
                }
                else { tryp = 0; }
            }
            u.P = tryp;
            subPower += u.P;
        }
        pvec.set([i, 0], subPower / POWER_FLOW_BASE_MW);
    }

    // Y-bus if necessary
    if (!this.state.Ybus) {
        this.state.Ybus = math.zeros(this.state.nsubs, this.state.nsubs) as math.Matrix;
        for (const key in this.state.branches) {
            const br = this.state.branches[key];
            const ybr = -1 / br.Z;
            const i = parseInt(br.FromNum) - 1;
            const j = parseInt(br.ToNum) - 1;
            if (br.Status1 === BranchStatus.IN) {
                this.state.Ybus.set([i, i], this.state.Ybus.get([i, i]) + ybr);
                this.state.Ybus.set([i, j], this.state.Ybus.get([i, j]) - ybr);
                this.state.Ybus.set([j, i], this.state.Ybus.get([j, i]) - ybr);
                this.state.Ybus.set([j, j], this.state.Ybus.get([j, j]) + ybr);
            }
            if (br.Circuits === 2 && br.Status2 === BranchStatus.IN) {
                this.state.Ybus.set([i, i], this.state.Ybus.get([i, i]) + ybr);
                this.state.Ybus.set([i, j], this.state.Ybus.get([i, j]) - ybr);
                this.state.Ybus.set([j, i], this.state.Ybus.get([j, i]) - ybr);
                this.state.Ybus.set([j, j], this.state.Ybus.get([j, j]) + ybr);
            }
        }
        for (const key in this.state.subs) {
            const sub = this.state.subs[key];
            const i = parseInt(sub.Number) - 1;
            if (sub.Number === REFERENCE_BUS_NUMBER_STR || sub.island === UNASSIGNED_ISLAND_ID) {
                this.state.Ybus.set([i, i], this.state.Ybus.get([i, i]) - REFERENCE_BUS_ADMITTANCE);
            }
        }
        this.state.Yinv = math.lup(this.state.Ybus);
    }

    // Power flow
    const theta = math.lusolve(this.state.Yinv!, pvec) as math.Matrix;
    
    for (const key in this.state.branches) {
        const br = this.state.branches[key];
        const ybr = -1 / br.Z;
        const i = parseInt(br.FromNum) - 1;
        const j = parseInt(br.ToNum) - 1;
        const ang_i = theta.get([i, 0]);
        const ang_j = theta.get([j, 0]);
        const pflow = -ybr * (ang_i - ang_j) * POWER_FLOW_BASE_MW;
        br.P = 0;
        if (br.Status1 === BranchStatus.IN) {
            br.P += pflow;
        }
        if (br.Circuits === 2 && br.Status2 === BranchStatus.IN) {
            br.P += pflow;
        }
    }
  }

  private _updateMetrics() {
    // Metrics and costs
    this.state.metrics.loadServed = 0;
    this.state.metrics.loadUnserved = 0;
    this.state.metrics.windGen = 0;
    this.state.metrics.solarGen = 0;
    this.state.metrics.thermalGen = 0;
    this.state.metrics.nuclearGen = 0;
    this.state.metrics.reserves = 0;
    this.state.metrics.currentFuelCost = 0;
    this.state.metrics.currentOpCost = 0;
    this.state.metrics.currentUnservedCost = 0;

    for (const key in this.state.subs) {
        const sub = this.state.subs[key];
        for (let iu = 0; iu < sub.Units; ++iu) {
            const u = sub.U[iu];
            const pmax_unit = sub.Pmax / sub.Units;
            if (sub.Category === SubstationCategory.Load) {
                if (u.Status === UnitStatus.IN) {
                    this.state.metrics.loadServed += u.P;
                } else {
                    this.state.metrics.loadUnserved += pmax_unit * this.state.fr_load;
                }
            } else {
                if (u.Status === UnitStatus.IN || u.Status === UnitStatus.STARTUP || u.Status === UnitStatus.SHUTDOWN) {
                    this.state.metrics.currentOpCost += sub.FixedCost;
                    this.state.metrics.currentFuelCost += sub.FuelCost * u.P;
                }
                if (u.Status === UnitStatus.IN) {
                    if (sub.Category === SubstationCategory.Wind) this.state.metrics.reserves += pmax_unit * this.state.fr_wind - u.P;
                    else if (sub.Category === SubstationCategory.Solar) this.state.metrics.reserves += pmax_unit * this.state.fr_solar - u.P;
                    else this.state.metrics.reserves += pmax_unit - u.P;
                }
                if (sub.Category === SubstationCategory.Wind) this.state.metrics.windGen += u.P;
                else if (sub.Category === SubstationCategory.Solar) this.state.metrics.solarGen += u.P;
                else if (sub.Category === SubstationCategory.Nuclear) this.state.metrics.nuclearGen += u.P;
                else this.state.metrics.thermalGen += u.P;
            }
        }
    }
    this.state.metrics.currentUnservedCost = this.state.metrics.loadUnserved * UNSERVED_LOAD_COST_PER_MW;
    this.state.metrics.totalFuelCost += this.state.metrics.currentFuelCost / MINUTES_PER_HOUR;
    this.state.metrics.totalOpCost += this.state.metrics.currentOpCost / MINUTES_PER_HOUR;
    this.state.metrics.totalUnservedCost += this.state.metrics.currentUnservedCost / MINUTES_PER_HOUR;
    this.state.metrics.totalCost = this.state.metrics.totalFuelCost + this.state.metrics.totalOpCost + this.state.metrics.totalUnservedCost;
    this.state.metrics.totalMwh += (this.state.metrics.loadServed + this.state.metrics.loadUnserved) / MINUTES_PER_HOUR;
    if (this.state.metrics.totalMwh > 0) {
        this.state.metrics.avgCost = this.state.metrics.totalCost / this.state.metrics.totalMwh;
    }
  }

  private _calculateUnitTempset(u: Unit, sub: Substation): number {
    const pmax = sub.Pmax / sub.Units;
    const pmin = sub.Pmin / sub.Units;

    // Determine the target setpoint for this tick.
    let psetForCalc = u.Pset;
    if (u.Status === UnitStatus.STARTUP && pmin > 0) { // For thermal/nuclear, target pmin during startup
        psetForCalc = pmin;
    }
    psetForCalc = Math.max(pmin, Math.min(pmax, psetForCalc)); // Safeguard clamp
    
    const tempset = Math.min(u.P + sub.Ramp, Math.max(u.P - sub.Ramp, psetForCalc));
    return tempset;
  }

  public draw(isPaused?: boolean, isFastForward?: boolean) {
    // First, ensure canvas dimensions are up-to-date. This is critical for the initial view calculation.
    this.drawer.resizeCanvas();

    // One-time initialization of the view after the canvas is ready.
    if (!this.isViewInitialized && this.drawer.isCanvasReady()) {
      this.drawer.setInitialView(this.state);
      this.isViewInitialized = true;
    }
    this.drawer.draw(this.state, isPaused ?? true, isFastForward ?? false);
  }

  public getDashboardStats(): GameStatistics {
    // Format time string
    const h = Math.floor(this.state.t / 60) + 1;
    const m = (this.state.t - (h - 1) * 60);
    const timeStr = `${h}:${m < 10 ? "0" + m : m} PM`;

    return {
      ...this.state.metrics,
      day: this.state.day,
      timeStr,
      timeStep: this.state.t,
      frequency: this.state.frequency,
      fr_wind: this.state.fr_wind,
      fr_solar: this.state.fr_solar,
    };
  }
}
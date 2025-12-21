import { Substation, Branch, DashboardStats, GameState, InteractionHandler, AlertHandler, HintHandler, STATUS_IN, STATUS_DIS, STATUS_TRIP, STATUS_STARTUP, STATUS_SHUTDOWN, CATEGORY_LOAD, CATEGORY_WIND, CATEGORY_SOLAR, CATEGORY_NUCLEAR } from "./types";
import { scenario_data } from "./scenario_data";
import { GameDrawer } from "./drawer";
import { GameHandler } from "./handler";
import { scenarios, IScenario } from "./scenarios";
import * as math from "mathjs"; 

// --- Unit Control ---
const RAMP_TO_MIN_SENTINEL = 99999;

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
const INITIAL_VIEW_X0 = -107;
const INITIAL_VIEW_Y0 = 37;
const INITIAL_SCALE = 100;
const VIEW_SCALE_ADJUST = 0.25;
const MAP_BOUNDS_XMAX = -80;
const MAP_BOUNDS_XMIN = -112;
const MAP_BOUNDS_YMAX = 40;
const MAP_BOUNDS_YMIN = 23;
const ZOOM_LIMIT_MAX = 800;
const ZOOM_LIMIT_MIN = 50;
const MAX_UNIT_SETPOINT = 10000;

export class GameEngine {
  private drawer: GameDrawer;
  private handler: GameHandler;
  private currentScenario: IScenario | null = null;
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
    scale_min: ZOOM_LIMIT_MIN,
    t: 0,
    day: 1,
    frequency: BASE_FREQUENCY,
    scaleX: INITIAL_SCALE,
    scaleY: INITIAL_SCALE,
    x0: INITIAL_VIEW_X0,
    y0: INITIAL_VIEW_Y0,
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
    
    // Metrics
    total_load_served: 0, 
    total_load_unserved: 0, 
    spin_reserves: 0,
    total_wind: 0,
    total_solar: 0,
    total_thermal: 0,
    total_nuclear: 0,
    current_fuel_cost: 0,
    current_running_cost: 0,
    current_uload_cost: 0,
    total_fuel_cost: 0,
    total_running_cost: 0,
    total_uload_cost: 0,
    total_cost: 0,
    average_cost: 0,
    total_mwh: 0,

    // Physics factors
    fr_load: 1,
    fr_wind: 1,
    fr_solar: 1,
  };

  constructor(canvas: HTMLCanvasElement) {
    this.drawer = new GameDrawer(canvas);
    // @ts-ignore - GameHandler constructor expects this.state to be fully initialized
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
    this.state.subs = scenario_data.subs;
    this.state.branches = scenario_data.branches;
    this.state.borders = scenario_data.borders;
    this.state.nsubs = scenario_data.nsubs;

    // Link branches to substations (ported from ready() in script.js)
    for (const key in this.state.branches) {
      const branch = this.state.branches[key];
      // @ts-ignore - raw data has IDs as strings, we link objects here
      branch.sub1 = this.state.subs[branch.FromNum];
      // @ts-ignore
      branch.sub2 = this.state.subs[branch.ToNum];
      if (branch.sub1 && branch.sub2) {
        branch.dist = Math.sqrt(
          Math.pow(branch.sub1.Latitude - branch.sub2.Latitude, 2) +
          Math.pow(branch.sub1.Longitude - branch.sub2.Longitude, 2)
        );
      }
    }
    this.setDefaults();
  }

  public setDefaults() {
    // Reset units
    for (let key in this.state.subs) {
      let sub = this.state.subs[key];
      for (let iu = 0; iu < sub.Units; ++iu) {
        let u = sub.U[iu];
        u.Status = u.Status0;
        u.P = u.Pset = u.P0;
        u.StatusCount = 0;
        if (sub.Category === CATEGORY_SOLAR || sub.Category === CATEGORY_WIND) {
          // Corrected from script.js: pmax -> Pmax
          u.Pset = sub.Pmax / sub.Units;
        }
      }
    }
    // Reset branches
    for (let key in this.state.branches) {
      let br = this.state.branches[key];
      br.P = 0;
      br.Status1 = STATUS_IN;
      br.Status2 = STATUS_IN;
    }
    // Reset View
    this.state.x0 = INITIAL_VIEW_X0;
    this.state.y0 = INITIAL_VIEW_Y0;
    this.state.scaleX = INITIAL_SCALE;
    this.state.scaleY = INITIAL_SCALE;
    
    // Reset Game State
    this.state.t = 0;
    this.state.Ybus = null;
    this.state.Yinv = null;
    this.state.frequency = BASE_FREQUENCY;
    this.state.fr_load = 1;
    this.state.fr_wind = 1;
    this.state.fr_solar = 1;

    // Reset Metrics
    this.state.total_load_served = 0;
    this.state.total_load_unserved = 0;
    this.state.total_wind = 0;
    this.state.total_solar = 0;
    this.state.total_thermal = 0;
    this.state.total_nuclear = 0;
    this.state.spin_reserves = 0;
    this.state.current_fuel_cost = 0;
    this.state.current_running_cost = 0;
    this.state.current_uload_cost = 0;
    this.state.total_fuel_cost = 0;
    this.state.total_running_cost = 0;
    this.state.total_uload_cost = 0;
    this.state.total_cost = 0;
    this.state.average_cost = 0;
    this.state.total_mwh = 0;
  }

  public startDay(day: number) {
    this.setDefaults();
    this.state.day = day;
    
    this.currentScenario = scenarios[day] || null;
    if (this.currentScenario) {
      this.currentScenario.start(this.state, this.onAlert, this.onHint);
    } else {
      // Default behavior or error for undefined day
      this.onAlert?.({ message: `Scenario for Day ${day} is not defined.`, critical: true }, true);
    }

    // Common setup for all days after day-specific changes
    for (let key in this.state.subs) {
        let sub = this.state.subs[key];
        for (let iu = 0 ; iu < sub.Units; ++iu) {
            let u = sub.U[iu];
            let pmax = sub.Pmax / sub.Units;
            if (sub.Category === CATEGORY_WIND) {
                u.P = pmax * this.state.fr_wind;
                u.Pset = pmax;
            }
            else if (sub.Category === CATEGORY_SOLAR) {
                u.P = pmax * this.state.fr_solar;
                u.Pset = pmax;
            }
        }
    }
  }
  
  public toggleUnitStatus(subId: string, unitIndex: number) {
    const sub = this.state.subs[subId];
    if (!sub) return;
    const u = sub.U[unitIndex];
    if (!u) return;

    // Logic from sub_click1 in script.js
    if (sub.Category === CATEGORY_LOAD) {
        if (u.Status === STATUS_DIS) u.Status = STATUS_IN;
        else if (u.Status === STATUS_IN) u.Status = STATUS_DIS;
    } else {
        if (u.Status === STATUS_DIS) {
            u.Status = STATUS_STARTUP;
            u.StatusCount = 0;
            u.Pset = RAMP_TO_MIN_SENTINEL; // Sentinel for "ramp to min"
        } else if (u.Status === STATUS_IN || u.Status === STATUS_STARTUP) {
            u.Status = STATUS_SHUTDOWN;
            u.StatusCount = 0;
        }
    }
    this.state.Ybus = null; // Invalidate Ybus
    this.draw();
  }

  public toggleBranchCircuitStatus(branchId: string, circuitNum: 1 | 2) {
      const branch = this.state.branches[branchId];
      if (!branch) return;

      if (circuitNum === 1 && branch.Status1 !== STATUS_TRIP) {
          branch.Status1 = branch.Status1 === STATUS_IN ? STATUS_DIS : STATUS_IN;
      } else if (circuitNum === 2 && branch.Circuits === 2 && branch.Status2 !== STATUS_TRIP) {
          branch.Status2 = branch.Status2 === STATUS_IN ? STATUS_DIS : STATUS_IN;
      }
      this.state.Ybus = null; // Invalidate Ybus
      this.draw();
  }

  public setUnitSetpoint(subId: string, unitIndex: number, newSetpoint: number) {
    const sub = this.state.subs[subId];
    if (!sub || !sub.U[unitIndex]) return;
    if (!isNaN(newSetpoint) && newSetpoint >= 0 && newSetpoint <= MAX_UNIT_SETPOINT) {
      sub.U[unitIndex].Pset = newSetpoint;
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
                    if (u.Status === STATUS_IN || u.Status === STATUS_STARTUP || u.Status === STATUS_SHUTDOWN) {
                        u.Status = STATUS_TRIP;
                        u.P = 0;
                        u.Pset = 0;
                        this.onAlert?.({ message: `${sub.Category === CATEGORY_LOAD ? "Load" : "Generator"} ${sub.Name} #${iu + 1} tripped due to frequency`, critical: true });
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
            if (br.Status1 === STATUS_IN || br.Status2 === STATUS_IN) {
                br.Status1 = STATUS_TRIP;
                br.Status2 = STATUS_TRIP;
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
            if (br.Status1 !== STATUS_IN && (br.Status2 !== STATUS_IN || br.Circuits === 1)) continue;
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
                if (u.Status === STATUS_IN || u.Status === STATUS_SHUTDOWN || u.Status === STATUS_STARTUP) {
                    u.Status = STATUS_TRIP;
                    u.P = 0;
                    u.Pset = 0;
                    const type = sub.Category === CATEGORY_LOAD ? "Load" : "Generator";
                    this.onAlert?.({ message: `${type} ${sub.Name} #${iu + 1} tripped due to separation from grid`, critical: true });
                }
            }
        }
    }
  }

  private _calculatePowerBalance() {
    let PL = 0, PGSET = 0, PBASE = 0, PGMIN = 0, PGMAX = 0;
    for (const key in this.state.subs) {
        const sub = this.state.subs[key];
        for (let iu = 0; iu < sub.Units; ++iu) {
            const u = sub.U[iu];
            const pmax = sub.Pmax / sub.Units;
            const pmin = sub.Pmin / sub.Units;
            u.StatusCount += 1;
            if (u.Pset < pmin) u.Pset = pmin;
            if (u.Pset > pmax) u.Pset = pmax;
            let tempset = Math.min(u.P + sub.Ramp, Math.max(u.P - sub.Ramp, u.Pset));
            if (u.Status === STATUS_DIS || u.Status === STATUS_TRIP) continue;
            if (sub.Category === CATEGORY_LOAD) {
                PL += pmax * this.state.fr_load;
            } else if (u.Status === STATUS_SHUTDOWN) {
                PBASE += pmax;
                PGMIN += Math.max(0, u.P - sub.Ramp);
                PGMAX += Math.max(0, u.P - sub.Ramp);
                PGSET += Math.max(0, u.P - sub.Ramp);
            } else if (sub.Category === CATEGORY_WIND) {
                PBASE += pmax;
                const pavail = pmax * this.state.fr_wind;
                if (tempset > pavail) tempset = pavail;
                PGMIN += Math.max(u.P - sub.Ramp, 0);
                PGMAX += Math.min(u.P + sub.Ramp, pavail);
                PGSET += tempset;
            } else if (sub.Category === CATEGORY_SOLAR) {
                PBASE += pmax;
                const pavail = pmax * this.state.fr_solar;
                if (tempset > pavail) tempset = pavail;
                PGMIN += Math.max(u.P - sub.Ramp, 0);
                PGMAX += Math.min(u.P + sub.Ramp, pavail);
                PGSET += tempset;
            } else {
                if (u.Status === STATUS_STARTUP) {
                    if (u.StatusCount >= sub.StartTime) {
                        PBASE += pmax;
                        PGMIN += Math.min(u.P + sub.Ramp, Math.max(pmin, u.P - sub.Ramp));
                        PGMAX += Math.min(pmax, u.P + sub.Ramp);
                        PGSET += tempset;
                    }
                } else {
                    PBASE += pmax;
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
            if (sub.Category === CATEGORY_LOAD && u.Status === STATUS_IN) {
                u.P = (sub.Pmax / sub.Units) * this.state.fr_load;
            } else if (u.Status === STATUS_DIS || u.Status === STATUS_TRIP) {
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
            if (sub.Category === CATEGORY_LOAD) continue;
            for (let iu = 0; iu < sub.Units; ++iu) {
                const u = sub.U[iu];
                if (u.Status === STATUS_DIS || u.Status === STATUS_TRIP) continue;
                
                const pmax = sub.Pmax / sub.Units;
                const pmin = sub.Pmin / sub.Units;
                let tempset = Math.min(u.P + sub.Ramp, Math.max(u.P - sub.Ramp, u.Pset));
                let tryp = 0;

                if (u.Status === STATUS_SHUTDOWN) {
                    tryp = Math.max(u.P - sub.Ramp, 0);
                } else if (sub.Category === CATEGORY_WIND) {
                    const pavail = pmax * this.state.fr_wind;
                    if (tempset > pavail) tempset = pavail;
                    tryp = Math.max(0, Math.min(pavail, u.P + sub.Ramp, tempset + alpha * pmax));
                } else if (sub.Category === CATEGORY_SOLAR) {
                    const pavail = pmax * this.state.fr_solar;
                    if (tempset > pavail) tempset = pavail;
                    tryp = Math.max(0, Math.min(pavail, u.P + sub.Ramp, tempset + alpha * pmax));
                } else { // Thermal, Nuclear
                    if (u.Status === STATUS_STARTUP && u.StatusCount >= sub.StartTime) {
                        tryp = Math.max(pmin, Math.min(pmax, u.P + sub.Ramp, tempset + alpha * pmax));
                    } else if (u.Status === STATUS_IN) {
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
            if (u.Status === STATUS_DIS || u.Status === STATUS_TRIP) {
                u.P = 0;
                continue;
            }

            const pmax = sub.Pmax / sub.Units;
            const pmin = sub.Pmin / sub.Units;
            let tempset = Math.min(u.P + sub.Ramp, Math.max(u.P - sub.Ramp, u.Pset));
            let tryp = 0;

            if (sub.Category === CATEGORY_LOAD) {
                subPower -= u.P;
                continue;
            } else if (u.Status === STATUS_SHUTDOWN) {
                tryp = Math.max(u.P - sub.Ramp, 0);
                if (tryp <= GENERATION_SHUTDOWN_THRESHOLD_MW) u.Status = STATUS_DIS;
            } else if (sub.Category === CATEGORY_WIND) {
                const pavail = pmax * this.state.fr_wind;
                if (tempset > pavail) tempset = pavail;
                tryp = Math.max(0, Math.min(pavail, u.P + sub.Ramp, tempset + alpha * pmax));
            } else if (sub.Category === CATEGORY_SOLAR) {
                const pavail = pmax * this.state.fr_solar;
                if (tempset > pavail) tempset = pavail;
                tryp = Math.max(0, Math.min(pavail, u.P + sub.Ramp, tempset + alpha * pmax));
            } else { // Thermal, Nuclear
                tryp = Math.max(pmin, Math.min(pmax, u.P + sub.Ramp, tempset + alpha * pmax));
            }

            if (u.Status === STATUS_STARTUP) {
                if (u.StatusCount >= sub.StartTime) { if (tryp >= pmin) u.Status = STATUS_IN; }
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
            if (br.Status1 === STATUS_IN) {
                this.state.Ybus.set([i, i], this.state.Ybus.get([i, i]) + ybr);
                this.state.Ybus.set([i, j], this.state.Ybus.get([i, j]) - ybr);
                this.state.Ybus.set([j, i], this.state.Ybus.get([j, i]) - ybr);
                this.state.Ybus.set([j, j], this.state.Ybus.get([j, j]) + ybr);
            }
            if (br.Circuits === 2 && br.Status2 === STATUS_IN) {
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
        if (br.Status1 === STATUS_IN) {
            br.P += pflow;
        }
        if (br.Circuits === 2 && br.Status2 === STATUS_IN) {
            br.P += pflow;
        }
    }
  }

  private _updateMetrics() {
    // Metrics and costs
    this.state.total_load_served = 0;
    this.state.total_load_unserved = 0;
    this.state.total_wind = 0;
    this.state.total_solar = 0;
    this.state.total_thermal = 0;
    this.state.total_nuclear = 0;
    this.state.spin_reserves = 0;
    this.state.current_fuel_cost = 0;
    this.state.current_running_cost = 0;
    this.state.current_uload_cost = 0;

    for (const key in this.state.subs) {
        const sub = this.state.subs[key];
        for (let iu = 0; iu < sub.Units; ++iu) {
            const u = sub.U[iu];
            const pmax_unit = sub.Pmax / sub.Units;
            if (sub.Category === CATEGORY_LOAD) {
                if (u.Status === STATUS_IN) {
                    this.state.total_load_served += u.P;
                } else {
                    this.state.total_load_unserved += pmax_unit * this.state.fr_load;
                }
            } else {
                if (u.Status === STATUS_IN || u.Status === STATUS_STARTUP || u.Status === STATUS_SHUTDOWN) {
                    this.state.current_running_cost += sub.FixedCost;
                    this.state.current_fuel_cost += sub.FuelCost * u.P;
                }
                if (u.Status === STATUS_IN) {
                    if (sub.Category === CATEGORY_WIND) this.state.spin_reserves += pmax_unit * this.state.fr_wind - u.P;
                    else if (sub.Category === CATEGORY_SOLAR) this.state.spin_reserves += pmax_unit * this.state.fr_solar - u.P;
                    else this.state.spin_reserves += pmax_unit - u.P;
                }
                if (sub.Category === CATEGORY_WIND) this.state.total_wind += u.P;
                else if (sub.Category === CATEGORY_SOLAR) this.state.total_solar += u.P;
                else if (sub.Category === CATEGORY_NUCLEAR) this.state.total_nuclear += u.P;
                else this.state.total_thermal += u.P;
            }
        }
    }
    this.state.current_uload_cost = this.state.total_load_unserved * UNSERVED_LOAD_COST_PER_MW;
    this.state.total_fuel_cost += this.state.current_fuel_cost / MINUTES_PER_HOUR;
    this.state.total_running_cost += this.state.current_running_cost / MINUTES_PER_HOUR;
    this.state.total_uload_cost += this.state.current_uload_cost / MINUTES_PER_HOUR;
    this.state.total_cost = this.state.total_fuel_cost + this.state.total_running_cost + this.state.total_uload_cost;
    this.state.total_mwh += (this.state.total_load_served + this.state.total_load_unserved) / MINUTES_PER_HOUR;
    if (this.state.total_mwh > 0) {
        this.state.average_cost = this.state.total_cost / this.state.total_mwh;
    }
  }

  public draw() {
    this.drawer.draw(this.state);
  }

  public getDashboardStats(): DashboardStats {
    // Format time string
    let h = Math.floor(this.state.t / 60) + 1;
    let m = (this.state.t - (h - 1) * 60);
    let timeStr = `${h}:${m < 10 ? "0" + m : m} PM`;

    return {
      day: this.state.day,
      timeStr,
      timeStep: this.state.t,
      frequency: this.state.frequency,
      loadServed: this.state.total_load_served,
      loadUnserved: this.state.total_load_unserved,
      reserves: this.state.spin_reserves,
      windGen: this.state.total_wind,
      solarGen: this.state.total_solar,
      thermalGen: this.state.total_thermal,
      nuclearGen: this.state.total_nuclear,
      avgCost: this.state.average_cost,
      totalCost: this.state.total_cost,
      currentOpCost: this.state.current_running_cost, // These are current hourly costs
      currentFuelCost: this.state.current_fuel_cost,   // These are current hourly costs
      currentUnservedCost: this.state.current_uload_cost, // These are current hourly costs
      totalOpCost: this.state.total_running_cost,
      totalFuelCost: this.state.total_fuel_cost,
      totalUnservedCost: this.state.total_uload_cost,
      fr_wind: this.state.fr_wind,
      fr_solar: this.state.fr_solar,
    };
  }

  public handleResize() {
    this.drawer.draw(this.state);
  }
}
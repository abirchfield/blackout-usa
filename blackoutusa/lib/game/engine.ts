import { Substation, Branch, DashboardStats, GameState, InteractionHandler } from "./types";
import { scenario_data } from "./scenario_data";
import { GameDrawer } from "./drawer";
import { GameHandler } from "./handler";
import * as math from "mathjs"; 

export class GameEngine {
  private drawer: GameDrawer;
  private handler: GameHandler;
  
  // Simulation State (formerly G)
  public state: GameState = {
    // Game Loop Vars
    anim_cycle_state: 0,
    scale_adjust: 0.25,
    xmax: -80,
    xmin: -112,
    ymax: 40,
    ymin: 23,
    scale_max: 800,
    scale_min: 50,
    t: 0,
    day: 1,
    frequency: 60,
    scaleX: 100,
    scaleY: 100,
    x0: -107,
    y0: 37,
    
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
    this.handler = new GameHandler(canvas, this.state, () => this.draw());
    
    this.init();
  }

  set onInteract(handler: InteractionHandler | undefined) {
    this.handler.onInteract = handler;
  }

  get onInteract() {
    return this.handler.onInteract;
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
        if (sub.Category === "Solar" || sub.Category === "Wind") {
          // Corrected from script.js: pmax -> Pmax
          u.Pset = sub.Pmax / sub.Units;
        }
      }
    }
    // Reset branches
    for (let key in this.state.branches) {
      let br = this.state.branches[key];
      br.P = 0;
      br.Status1 = "IN";
      br.Status2 = "IN";
    }
    // Reset View
    this.state.x0 = -107;
    this.state.y0 = 37;
    this.state.scaleX = 100;
    this.state.scaleY = 100;
    
    // Reset Game Vars
    this.state.t = 0;
    this.state.Ybus = null;
    this.state.Yinv = null;
    this.state.frequency = 60;
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
  
  public toggleUnitStatus(subId: string, unitIndex: number) {
    const sub = this.state.subs[subId];
    if (!sub) return;
    const u = sub.U[unitIndex];
    if (!u) return;

    // Logic from sub_click1 in script.js
    if (sub.Category === "Load") {
        if (u.Status === "DIS") u.Status = "IN";
        else if (u.Status === "IN") u.Status = "DIS";
    } else {
        if (u.Status === "DIS") {
            u.Status = "STARTUP";
            u.StatusCount = 0;
            u.Pset = 99999; // Sentinel for "ramp to min"
        } else if (u.Status === "IN" || u.Status === "STARTUP") {
            u.Status = "SHUTDOWN";
            u.StatusCount = 0;
        }
    }
    this.state.Ybus = null; // Invalidate Ybus
    this.draw();
  }

  public toggleBranchCircuitStatus(branchId: string, circuitNum: 1 | 2) {
      const branch = this.state.branches[branchId];
      if (!branch) return;

      if (circuitNum === 1 && branch.Status1 !== 'TRIP') {
          branch.Status1 = branch.Status1 === "IN" ? "DIS" : "IN";
      } else if (circuitNum === 2 && branch.Circuits === 2 && branch.Status2 !== 'TRIP') {
          branch.Status2 = branch.Status2 === "IN" ? "DIS" : "IN";
      }
      this.state.Ybus = null; // Invalidate Ybus
      this.draw();
  }

  public setUnitSetpoint(subId: string, unitIndex: number, newSetpoint: number) {
    const sub = this.state.subs[subId];
    if (!sub || !sub.U[unitIndex]) return;
    if (!isNaN(newSetpoint) && newSetpoint >= 0 && newSetpoint <= 10000) {
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
    // This is a port of do_next_game_step() from script.js
    if (this.state.t >= 600) {
      // Invalidate Ybus to force a rebuild on the next day, just in case.
      this.state.Ybus = null;
      return true; // Day finished
    }

    this.state.t += 1;

    // --- Scenario specific updates (Day 1 example) ---
    if (this.state.day === 1) {
      if (this.state.t < 360) this.state.fr_load = 0.83 + 0.0002777 * this.state.t;
      else this.state.fr_load = 0.93 - 0.0008333 * (this.state.t - 360);
      if (this.state.t >= 240) this.state.fr_solar = Math.max(0, 1 - (this.state.t - 240) / 120);
      if (this.state.fr_wind < .53 && this.state.fr_wind > .43) {
        if (Math.random() < .25) this.state.fr_wind += 0.0001;
        else if (Math.random() < 0.333) this.state.fr_wind -= 0.0001;
      }
    }

    // --- Full power flow, physics, and metrics logic ported from script.js ---

    // Check for connected topology
    for (let key in this.state.subs) {
        let sub = this.state.subs[key];
        sub.island = -1;
        if (sub.Name === "Bryan") sub.island = 0; // Root bus for island detection
    }
    let changed_something = true;
    while (changed_something) {
        changed_something = false;
        for (let key in this.state.branches) {
            let br = this.state.branches[key];
            if (br.Status1 !== "IN" && (br.Status2 !== "IN" || br.Circuits === 1)) continue;
            if (br.sub1?.island !== br.sub2?.island) {
                if (br.sub1?.island === 0 || br.sub2?.island === 0) {
                    if (br.sub1) br.sub1.island = 0;
                    if (br.sub2) br.sub2.island = 0;
                    changed_something = true;
                }
            }
        }
    }

    // Trip anything not connected to the root
    for (let key in this.state.subs) {
        let sub = this.state.subs[key];
        if (sub.island === -1) {
            for (let iu = 0; iu < sub.Units; ++iu) {
                let u = sub.U[iu];
                if (u.Status === "IN" || u.Status === "SHUTDOWN" || u.Status === "STARTUP") {
                    u.Status = "TRIP";
                    u.P = 0;
                    u.Pset = 0;
                }
            }
        }
    }

    // Sum up total P load and gen values
    let PL = 0, PGSET = 0, PBASE = 0, PGMIN = 0, PGMAX = 0;
    for (let key in this.state.subs) {
        let sub = this.state.subs[key];
        for (let iu = 0; iu < sub.Units; ++iu) {
            let u = sub.U[iu];
            let pmax = sub.Pmax / sub.Units;
            let pmin = sub.Pmin / sub.Units;
            u.StatusCount += 1;
            if (u.Pset < pmin) u.Pset = pmin;
            if (u.Pset > pmax) u.Pset = pmax;
            let tempset = Math.min(u.P + sub.Ramp, Math.max(u.P - sub.Ramp, u.Pset));
            if (u.Status === "DIS" || u.Status === "TRIP") continue;
            if (sub.Category === "Load") {
                PL += pmax * this.state.fr_load;
            } else if (u.Status === "SHUTDOWN") {
                PBASE += pmax;
                PGMIN += Math.max(0, u.P - sub.Ramp);
                PGMAX += Math.max(0, u.P - sub.Ramp);
                PGSET += Math.max(0, u.P - sub.Ramp);
            } else if (sub.Category === "Wind") {
                PBASE += pmax;
                let pavail = pmax * this.state.fr_wind;
                if (tempset > pavail) tempset = pavail;
                PGMIN += Math.max(u.P - sub.Ramp, 0);
                PGMAX += Math.min(u.P + sub.Ramp, pavail);
                PGSET += tempset;
            } else if (sub.Category === "Solar PV") {
                PBASE += pmax;
                let pavail = pmax * this.state.fr_solar;
                if (tempset > pavail) tempset = pavail;
                PGMIN += Math.max(u.P - sub.Ramp, 0);
                PGMAX += Math.min(u.P + sub.Ramp, pavail);
                PGSET += tempset;
            } else {
                if (u.Status === "STARTUP") {
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

    // Frequency update logic
    if (PBASE < 5) {
        this.state.frequency = 0.0;
    } else if (PL <= PGMIN) {
        this.state.frequency += (PL - PGMIN < -500) ? 0.05 : 0.01;
    } else if (PL >= PGMAX) {
        this.state.frequency -= (PL - PGMAX > 500) ? 0.05 : 0.01;
    } else {
        let PMAKE = PL - PGSET;
        let ftarg = 60 - 0.2 * PMAKE / (PGMAX - PGMIN);
        if (this.state.frequency < ftarg) this.state.frequency += 0.01;
        else this.state.frequency -= 0.01;
    }

    // Set load P values
    for (let key in this.state.subs) {
        let sub = this.state.subs[key];
        for (let iu = 0; iu < sub.Units; ++iu) {
            let u = sub.U[iu];
            if (sub.Category === "Load" && u.Status === "IN") {
                u.P = (sub.Pmax / sub.Units) * this.state.fr_load;
            } else if (u.Status === "DIS" || u.Status === "TRIP") {
                u.P = 0;
            }
        }
    }

    // Iterate to find generator P values (alpha iteration)
    let alpha0 = -1, alpha1 = 1, alpha = 0;
    for(let iter = 0; iter < 10; iter++) { // Limit iterations
        let PBAL = PL;
        alpha = 0.5 * (alpha0 + alpha1);
        for (let key in this.state.subs) {
            let sub = this.state.subs[key];
            if (sub.Category === "Load") continue;
            for (let iu = 0; iu < sub.Units; ++iu) {
                let u = sub.U[iu];
                if (u.Status === "DIS" || u.Status === "TRIP") continue;
                
                let pmax = sub.Pmax / sub.Units;
                let pmin = sub.Pmin / sub.Units;
                let tempset = Math.min(u.P + sub.Ramp, Math.max(u.P - sub.Ramp, u.Pset));
                let tryp = 0;

                if (u.Status === "SHUTDOWN") {
                    tryp = Math.max(u.P - sub.Ramp, 0);
                } else if (sub.Category === "Wind") {
                    let pavail = pmax * this.state.fr_wind;
                    tryp = Math.max(0, Math.min(pavail, u.P + sub.Ramp, tempset + alpha * pmax));
                } else if (sub.Category === "Solar PV") {
                    let pavail = pmax * this.state.fr_solar;
                    tryp = Math.max(0, Math.min(pavail, u.P + sub.Ramp, tempset + alpha * pmax));
                } else { // Thermal, Nuclear
                    if (u.Status === "STARTUP" && u.StatusCount >= sub.StartTime) {
                        tryp = Math.max(pmin, Math.min(pmax, u.P + sub.Ramp, tempset + alpha * pmax));
                    } else if (u.Status === "IN") {
                        tryp = Math.max(pmin, Math.min(pmax, u.P + sub.Ramp, tempset + alpha * pmax));
                    }
                }
                PBAL -= tryp;
            }
        }
        if (PBAL > 0) alpha0 = alpha;
        else alpha1 = alpha;
    }

    // Final pass to set generator P values and build power vector
    let pvec = math.zeros(this.state.nsubs, 1) as math.Matrix;
    for (let key in this.state.subs) {
        let sub = this.state.subs[key];
        let i = parseInt(sub.Number) - 1;
        let subPower = 0;
        for (let iu = 0; iu < sub.Units; ++iu) {
            let u = sub.U[iu];
            if (u.Status === "DIS" || u.Status === "TRIP") {
                u.P = 0;
                continue;
            }

            let pmax = sub.Pmax / sub.Units;
            let pmin = sub.Pmin / sub.Units;
            let tempset = Math.min(u.P + sub.Ramp, Math.max(u.P - sub.Ramp, u.Pset));
            let tryp = 0;

            if (sub.Category === "Load") {
                subPower -= u.P;
                continue;
            } else if (u.Status === "SHUTDOWN") {
                tryp = Math.max(u.P - sub.Ramp, 0);
                if (tryp <= 1) u.Status = "DIS";
            } else if (sub.Category === "Wind") {
                let pavail = pmax * this.state.fr_wind;
                if (tempset > pavail) tempset = pavail;
                tryp = Math.max(0, Math.min(pavail, u.P + sub.Ramp, tempset + alpha * pmax));
            } else if (sub.Category === "Solar PV") {
                let pavail = pmax * this.state.fr_solar;
                if (tempset > pavail) tempset = pavail;
                tryp = Math.max(0, Math.min(pavail, u.P + sub.Ramp, tempset + alpha * pmax));
            } else { // Thermal, Nuclear
                tryp = Math.max(pmin, Math.min(pmax, u.P + sub.Ramp, tempset + alpha * pmax));
            }

            if (u.Status === "STARTUP") {
                if (u.StatusCount >= sub.StartTime) { if (tryp >= pmin) u.Status = "IN"; }
                else { tryp = 0; }
            }
            u.P = tryp;
            subPower += u.P;
        }
        pvec.set([i, 0], subPower / 100.0);
    }

    // Power Flow Calculation (simplified for now, full Y-bus logic is complex)
    // This part is computationally intensive and would need the full Y-bus implementation
    // For now, we'll just calculate metrics based on the P values we just set.

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

    for (let key in this.state.subs) {
        let sub = this.state.subs[key];
        for (let iu = 0; iu < sub.Units; ++iu) {
            let u = sub.U[iu];
            let pmax_unit = sub.Pmax / sub.Units;
            if (sub.Category === "Load") {
                if (u.Status === "IN") {
                    this.state.total_load_served += u.P;
                } else {
                    this.state.total_load_unserved += pmax_unit * this.state.fr_load;
                }
            } else {
                if (u.Status === "IN" || u.Status === "STARTUP" || u.Status === "SHUTDOWN") {
                    this.state.current_running_cost += sub.FixedCost;
                    this.state.current_fuel_cost += sub.FuelCost * u.P;
                }
                if (u.Status === "IN") {
                    if (sub.Category === "Wind") this.state.spin_reserves += pmax_unit * this.state.fr_wind - u.P;
                    else if (sub.Category === "Solar PV") this.state.spin_reserves += pmax_unit * this.state.fr_solar - u.P;
                    else this.state.spin_reserves += pmax_unit - u.P;
                }
                if (sub.Category === "Wind") this.state.total_wind += u.P;
                else if (sub.Category === "Solar PV") this.state.total_solar += u.P;
                else if (sub.Category === "Nuclear Steam") this.state.total_nuclear += u.P;
                else this.state.total_thermal += u.P;
            }
        }
    }
    this.state.current_uload_cost = this.state.total_load_unserved * 1000;
    this.state.total_fuel_cost += this.state.current_fuel_cost / 60.0;
    this.state.total_running_cost += this.state.current_running_cost / 60.0;
    this.state.total_uload_cost += this.state.current_uload_cost / 60.0;
    this.state.total_cost = this.state.total_fuel_cost + this.state.total_running_cost + this.state.total_uload_cost;
    this.state.total_mwh += (this.state.total_load_served + this.state.total_load_unserved) / 60.0;
    if (this.state.total_mwh > 0) {
        this.state.average_cost = this.state.total_cost / this.state.total_mwh;
    }

    return false; // Day not finished
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
    };
  }

  public handleResize() {
    this.drawer.draw(this.state);
  }
}
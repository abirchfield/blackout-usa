import { Substation, Branch, DashboardStats, GameState, InteractionHandler, AlertHandler, Alert } from "./types";
import { scenario_data } from "./scenario_data";
import { GameDrawer } from "./drawer";
import { GameHandler } from "./handler";
import * as math from "mathjs"; 

export class GameEngine {
  private drawer: GameDrawer;
  private handler: GameHandler;
  public static readonly GAME_DURATION = 600;
  
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

  public startDay(day: number) {
    this.setDefaults();
    this.state.day = day;

    // Scenario specific setup items from script.js start_day()
    if (day === 1) {
        this.state.fr_load = 0.83;
        this.state.fr_wind = 0.48;
        this.state.fr_solar = 1.00;        
        this.onAlert?.({ message: "Your shift has started. Click \"View all Alerts\" to see additional hints for what to do.", critical: false }, true);
        this.onAlert?.({ message: "Hint #1: The McCamey Solar PV plant in West Texas is currently disconnected. You might as well start up all 3 units at that plant to get more, low-cost energy.", critical: false });
        this.onAlert?.({ message: "Hint #2: The Mission Gas Turbine plant in South Texas has very high costs. Try shutting down 1-3 of these units while you still have plenty of reserves.", critical: false });
        this.onAlert?.({ message: "Hint #3: You are going to need more reserves in the evening once the solar has gone down and the load is higher.", critical: false });
        this.onAlert?.({ message: "Hint #4: For the rest of the day, watch the reserves carefully. If they get below 500 MW you need to find new generation to start up.", critical: false });
    }
    else if (day === 2) {
        this.state.fr_load = 0.83;
        this.state.fr_wind = 0.48;
        this.state.fr_solar = 1.00;        
        this.onAlert?.({ message: "Hint for Day 2: Watch the East-West lines. If they turn yellow or orange start shutting down western generation", critical: false }, true);
    }
    else if (day === 3) {
        this.state.fr_load = 0.83;
        this.state.fr_wind = 0.48;
        this.state.fr_solar = 1.00;        
        this.onAlert?.({ message: "No hints for Day 3: You can do this!", critical: false }, true);
    }
    else if (day === 4) {
        this.state.fr_load = 0.83;
        this.state.fr_wind = 0.48;
        this.state.fr_solar = 1.00;        
        this.onAlert?.({ message: "Hint for Day 4: Things can happen really fast when there is rapid loss of generation. Stay vigilent!", critical: false }, true);
    }
    else if (day === 5) {
        this.state.fr_load = 0.83;
        this.state.fr_wind = 0.48;
        this.state.fr_solar = 1.00;        
        
        let i;
        for (i=0;i<5;++i) this.state.subs["2"].U[i].Status = "TRIP"; 
        for (i=0;i<3;++i) this.state.subs["5"].U[i].Status = "TRIP"; 
        for (i=0;i<4;++i) this.state.subs["8"].U[i].Status = "TRIP"; 
        for (i=0;i<8;++i) this.state.subs["10"].U[i].Status = "DIS"; 
        for (i=0;i<4;++i) this.state.subs["14"].U[i].Status = "TRIP"; 
        for (i=0;i<8;++i) this.state.subs["15"].U[i].Status = "TRIP"; 
        for (i=2;i<5;++i) this.state.subs["16"].U[i].Status = "TRIP"; 
        for (i=1;i<4;++i) this.state.subs["21"].U[i].Status = "TRIP"; 
        for (i=0;i<4;++i) this.state.subs["25"].U[i].Status = "TRIP"; 
        for (i=0;i<2;++i) this.state.subs["31"].U[i].Status = "TRIP"; 
        this.state.branches["5"].Status1 = "TRIP";
        this.state.branches["10"].Status1 = "TRIP";
        this.state.branches["11"].Status1 = "TRIP";
        this.state.branches["15"].Status1 = "TRIP";
        this.state.branches["16"].Status1 = "TRIP";
        this.state.branches["20"].Status1 = "TRIP";
        this.state.branches["21"].Status1 = "TRIP";
        this.state.branches["29"].Status1 = "TRIP";
        this.state.branches["30"].Status1 = "TRIP";
        this.state.branches["31"].Status1 = "TRIP";
        this.state.branches["32"].Status1 = "TRIP";
        this.state.branches["32"].Status2 = "TRIP";
        this.state.branches["33"].Status1 = "TRIP"; 
        this.state.branches["35"].Status1 = "TRIP";
        this.state.branches["35"].Status2 = "TRIP";
        this.state.branches["36"].Status1 = "TRIP"; 
        this.state.branches["36"].Status2 = "TRIP";
        this.state.branches["43"].Status1 = "TRIP";
        this.state.branches["44"].Status1 = "TRIP";
        this.state.branches["50"].Status1 = "TRIP";
        this.state.branches["59"].Status1 = "TRIP";
        this.state.branches["59"].Status2 = "TRIP";
        this.state.branches["60"].Status1 = "TRIP";
        for (i=0;i<2;++i) this.state.subs["26"].U[i].P = 290; 
        for (i=0;i<3;++i) this.state.subs["19"].U[i].Status = "IN"; 
        
        this.onAlert?.({ message: "Hint for Day 5: Keep checking the coastal substations and lines to see if anything new has become ready for restoration", critical: false }, true);
    }

    // Common setup for all days after day-specific changes
    for (let key in this.state.subs) {
        let sub = this.state.subs[key];
        for (let iu = 0 ; iu < sub.Units; ++iu) {
            let u = sub.U[iu];
            let pmax = sub.Pmax / sub.Units;
            if (sub.Category === "Wind") {
                u.P = pmax * this.state.fr_wind;
                u.Pset = pmax;
            }
            else if (sub.Category === "Solar PV") {
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
    if (this.state.t >= GameEngine.GAME_DURATION) {
      // Invalidate Ybus to force a rebuild on the next day, just in case.
      this.state.Ybus = null;
      return true; // Day finished
    }

    this.state.t += 1;

    // --- Scenario specific updates ---
    if (this.state.day === 1) {
        if (this.state.t < 360) this.state.fr_load = 0.83 + 0.0002777 * this.state.t;
        else this.state.fr_load = 0.93 - 0.0008333 * (this.state.t - 360);
        if (this.state.t >= 240) this.state.fr_solar = Math.max(0, 1 - (this.state.t - 240) / 120);
        if (this.state.fr_wind < .53 && this.state.fr_wind > .43) {
            if (Math.random() < .25) this.state.fr_wind += 0.0001;
            else if (Math.random() < 0.333) this.state.fr_wind -= 0.0001;
        }
    } else if (this.state.day === 2) {
        if (this.state.t < 360) this.state.fr_load = 0.83 + 0.0002777 * this.state.t;
        else this.state.fr_load = 0.93 - 0.0008333 * (this.state.t - 360);
        if (this.state.t >= 240) this.state.fr_solar = Math.max(0, 1 - (this.state.t - 240) / 120);
        if (this.state.t < 180) this.state.fr_wind = 0.48 + 0.0028 * this.state.t;
        
        if (this.state.t === 90) {
            this.state.branches["26"].Status1 = "TRIP";
            this.state.branches["26"].Status2 = "TRIP";
            this.onAlert?.({ message: `Maintenance requires tripping both Abiline - Ft Worth lines`, critical: false });
            this.state.Ybus = null;
        }
    } else if (this.state.day === 3) {
        if (this.state.t < 360) this.state.fr_load = 0.83 + 0.0002777 * this.state.t;
        else this.state.fr_load = 0.93 - 0.0008333 * (this.state.t - 360);
        if (this.state.t >= 240) this.state.fr_solar = Math.max(0, 1 - (this.state.t - 240) / 120);
        if (this.state.t < 180) this.state.fr_wind = 0.48 + 0.0028 * this.state.t;

        if (this.state.t > 240) {
            const tbranches = ["1", "2", "3", "4", "26", "27"];
            for (let i = 0; i < tbranches.length; ++i) {
                if (Math.random() < 0.05) {
                    const br = this.state.branches[tbranches[i]];
                    if (br.Status1 === "TRIP") continue;
                    br.Status1 = "TRIP";
                    br.Status2 = "TRIP";
                    this.onAlert?.({ message: `${br.sub1?.Name}-${br.sub2?.Name} transmission line trips due to tornado`, critical: true });
                    this.state.Ybus = null;
                }
            }
        }
        if (this.state.t === 30) {
            this.state.subs["31"].U[0].Status = "SHUTDOWN";
            this.onAlert?.({ message: `Scheduled shutdown of Wadsworth Unit #1 begins`, critical: false });
        }
    } else if (this.state.day === 4) {
        if (this.state.t < 360) this.state.fr_load = 0.83 + 0.0002777 * this.state.t;
        else this.state.fr_load = 0.93 - 0.0008333 * (this.state.t - 360);
        if (this.state.t >= 240) this.state.fr_solar = Math.max(0, 1 - (this.state.t - 240) / 120);
        if (this.state.t < 180) this.state.fr_wind = 0.48 + 0.0028 * this.state.t;

        const outages = [[90, "2", 3], [120, "2", 4], [75, "2", 1], [350, "2", 0], [410, "2", 1], [190, "24", 3], [220, "24", 4], [375, "24", 1], [50, "24", 0], [210, "24", 1], [400, "31", 1], [300, "4", 0], [300, "4", 1],[300, "4", 2],[300, "4", 3], [250, "26", 1], [290, "28", 0], [330, "20", 0], [335, "20", 1], [340, "20", 2], [360, "20", 3], [390, "20", 4], [100, "21", 2], [150, "21", 1], [180, "21", 0]];
        for (const outage of outages) {
            if (this.state.t === outage[0]) {
                const sub = this.state.subs[outage[1] as string];
                const u = sub.U[outage[2] as number];
                u.Status = "TRIP";
                this.onAlert?.({ message: `${sub.Name} unit #${(outage[2] as number) + 1} trips due to cold weather`, critical: true });
            }
        }
    } else if (this.state.day === 5) {
        if (this.state.t < 360) this.state.fr_load = 0.83 + 0.0002777 * this.state.t;
        else this.state.fr_load = 0.93 - 0.0008333 * (this.state.t - 360);
        if (this.state.t >= 240) this.state.fr_solar = Math.max(0, 1 - (this.state.t - 240) / 120);
        if (this.state.t < 180) this.state.fr_wind = 0.48 + 0.0028 * this.state.t;

        const restorations: [number, string, number | 'all' | 'b1' | 'b2'][] = [
            [30, "15", 'all-u-3'], [50, "35", 'b2'], [70, "8", 'all'], [90, "33", 'b1'], [110, "59", 'b1'], [130, "5", 'all'], [150, "5", 'b1'], [170, "43", 'b1'], [190, "25", 'all-u-2'], [200, "15", 'all-u-8-from-3'], [230, "16", 'all-u-5-from-2'], [250, "10", 'b1'], [270, "25", 'all-u-4-from-2'], [300, "21", 'all-u-4-from-1'], [360, "14", 'all-u-2'], [390, "30", 'b1'], [420, "2", 'all-u-5-from-3'], [430, "14", 'all-u-4-from-2'], [440, "15", 'b1'], [450, "20", 'b1'], [460, "16", 'b1'], [490, "29", 'b1'], [500, "50", 'b1'], [520, "21", 'b1'], [540, "36", 'b1'],
        ];
        restorations.forEach(([time, id, target]) => {
            if (this.state.t === time) {
                if (typeof target === 'string' && target.startsWith('b')) { // Branch
                    const br = this.state.branches[id];
                    if (target === 'b1' && br.Status1 === 'TRIP') br.Status1 = 'DIS';
                    if (target === 'b2' && br.Status2 === 'TRIP') br.Status2 = 'DIS';
                } else { // Substation units
                    const sub = this.state.subs[id];
                    if (target === 'all') sub.U.forEach(u => { if(u.Status === 'TRIP') u.Status = 'DIS' });
                    else if (typeof target === 'string' && target.includes('-u-')) {
                        const parts = target.split('-u-');
                        const count = parseInt(parts[1]);
                        let startIdx = 0;
                        if (target.includes('-from-')) {
                            startIdx = parseInt(target.split('-from-')[1]);
                        }
                        for (let i = startIdx; i < (startIdx + count); i++) if(sub.U[i]?.Status === 'TRIP') sub.U[i].Status = 'DIS';
                    }
                }
            }
        });
    }

    // --- Physics-based tripping ---
    // Frequency-based tripping
    let freq = this.state.frequency;
    for (let key in this.state.subs) {
        let sub = this.state.subs[key];
        let prob_trip = 0;
        if (freq < 57 || freq > 63) prob_trip = 0.05;
        else if (freq < 59 || freq > 61) prob_trip = 0.01;
        else if (freq < 59.3 || freq > 60.7) prob_trip = 0.001;

        for (let iu = 0; iu < sub.Units; ++iu) {
            if (Math.random() < prob_trip) {
                let u = sub.U[iu];
                if (u.Status === "IN" || u.Status === "STARTUP" || u.Status === "SHUTDOWN") {
                    u.Status = "TRIP";
                    u.P = 0;
                    u.Pset = 0;
                    this.onAlert?.({ message: `${sub.Category === "Load" ? "Load" : "Generator"} ${sub.Name} #${iu + 1} tripped due to frequency`, critical: true });
                    this.state.Ybus = null;
                }
            }
        }
    }

    // Overload-based tripping
    for (let key in this.state.branches) {
        let br = this.state.branches[key];
        let prob_trip = 0;
        if (Math.abs(br.P) > br.Pmax * br.Circuits * 1.5) prob_trip = 0.05;
        else if (Math.abs(br.P) > br.Pmax * br.Circuits * 1.2) prob_trip = 0.01;

        if (Math.random() < prob_trip) {
            if (br.Status1 === "IN" || br.Status2 === "IN") {
                br.Status1 = "TRIP";
                br.Status2 = "TRIP";
                this.onAlert?.({ message: `Branch ${br.sub1?.Name}-${br.sub2?.Name} tripped on overloading!`, critical: true });
                this.state.Ybus = null;
            }
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
                    const type = sub.Category === "Load" ? "Load" : "Generator";
                    this.onAlert?.({ message: `${type} ${sub.Name} #${iu + 1} tripped due to separation from grid`, critical: true });
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

    // Y-bus if necessary
    if (!this.state.Ybus) {
        this.state.Ybus = math.zeros(this.state.nsubs, this.state.nsubs) as math.Matrix;
        for (let key in this.state.branches) {
            let br = this.state.branches[key];
            let ybr = -1 / br.Z;
            let i = parseInt(br.FromNum) - 1;
            let j = parseInt(br.ToNum) - 1;
            if (br.Status1 === "IN") {
                this.state.Ybus.set([i, i], this.state.Ybus.get([i, i]) + ybr);
                this.state.Ybus.set([i, j], this.state.Ybus.get([i, j]) - ybr);
                this.state.Ybus.set([j, i], this.state.Ybus.get([j, i]) - ybr);
                this.state.Ybus.set([j, j], this.state.Ybus.get([j, j]) + ybr);
            }
            if (br.Circuits === 2 && br.Status2 === "IN") {
                this.state.Ybus.set([i, i], this.state.Ybus.get([i, i]) + ybr);
                this.state.Ybus.set([i, j], this.state.Ybus.get([i, j]) - ybr);
                this.state.Ybus.set([j, i], this.state.Ybus.get([j, i]) - ybr);
                this.state.Ybus.set([j, j], this.state.Ybus.get([j, j]) + ybr);
            }
        }
        for (let key in this.state.subs) {
            let sub = this.state.subs[key];
            let i = parseInt(sub.Number) - 1;
            if (sub.Number === "6" || sub.island === -1) {
                this.state.Ybus.set([i, i], this.state.Ybus.get([i, i]) - 1000);
            }
        }
        this.state.Yinv = math.lup(this.state.Ybus);
    }

    // Power flow
    let theta = math.lusolve(this.state.Yinv!, pvec) as math.Matrix;
    
    for (let key in this.state.branches) {
        let br = this.state.branches[key];
        let ybr = -1 / br.Z;
        let i = parseInt(br.FromNum) - 1;
        let j = parseInt(br.ToNum) - 1;
        let ang_i = theta.get([i, 0]);
        let ang_j = theta.get([j, 0]);
        let pflow = -ybr * (ang_i - ang_j) * 100;
        br.P = 0;
        if (br.Status1 === "IN") {
            br.P += pflow;
        }
        if (br.Circuits === 2 && br.Status2 === "IN") {
            br.P += pflow;
        }
    }

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
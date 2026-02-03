import { GameStatistics, GameState, InteractionHandler, AlertHandler, HintHandler, Briefing, SubstationCategory, IScenario, ResultDetails, SimulationAction } from "./types";
import { createInitialSimulationState, createInitialInputState } from "./factories";
import { GameDrawer } from "./canvas-drawer";
import { GameHandler } from "./canvas-handler";
import { scenarios } from "./scenarios";
import { defaultKeyBindings, KeyBindings } from "./key-bindings";
import { PowerFlowSolver } from "./simulation/power-flow";
import { DispatchSolver } from "./simulation/dispatch";
import { TopologyAnalyzer } from "./simulation/topology";
import { ContingencyManager } from "./simulation/contingency";
import { MetricsCalculator } from "./simulation/metrics";
import { GridOperator } from "./simulation/operator";
import { GridLoader } from "./simulation/loader";
import { PhysicsConfig, ViewConfig } from "./config";

export class GameEngine {
  private drawer: GameDrawer;
  private handler?: GameHandler;
  private pfSolver: PowerFlowSolver;
  private dispatchSolver: DispatchSolver;
  private topologyAnalyzer: TopologyAnalyzer;
  private contingencyManager: ContingencyManager;
  private metricsCalculator: MetricsCalculator;
  private operator: GridOperator;
  private currentScenario: IScenario | null = null;
  private animationFrameId?: number;
  private isDestroyed = false;
  private isViewInitialized = false;
  public static readonly GAME_DURATION = 600;
  private isBlackout = false;
  
  // Simulation State (formerly G)
  public state: GameState = {
    // Game Loop Vars
    ...createInitialSimulationState(),
    ...createInitialInputState(),
    
    // View State
    anim_cycle_state: 0,
    scale_adjust: ViewConfig.SCALE_ADJUST,
    xmax: ViewConfig.MAP_BOUNDS.XMAX,
    xmin: ViewConfig.MAP_BOUNDS.XMIN,
    ymax: ViewConfig.MAP_BOUNDS.YMAX,
    ymin: ViewConfig.MAP_BOUNDS.YMIN,
    scale_max: ViewConfig.ZOOM_LIMIT_MAX,
    scale_min: 0, // Will be set dynamically by drawer
    scaleX: ViewConfig.INITIAL_SCALE, 
    scaleY: ViewConfig.INITIAL_SCALE, 
    x0: ViewConfig.INITIAL_X0,     
    y0: ViewConfig.INITIAL_Y0,     
    theme: 'dark',
    animationsEnabled: true,
    renderCanvasText: true,
    zoomSensitivity: ViewConfig.ZOOM_SENSITIVITY_DEFAULT,
    debug_draw_map_bounds: false,
    keyBindings: defaultKeyBindings,
  };

  constructor(canvas: HTMLCanvasElement, options: { interactive?: boolean } = { interactive: true }) {
    this.drawer = new GameDrawer(canvas);
    this.pfSolver = new PowerFlowSolver();
    this.dispatchSolver = new DispatchSolver();
    this.topologyAnalyzer = new TopologyAnalyzer();
    this.contingencyManager = new ContingencyManager();
    this.metricsCalculator = new MetricsCalculator();
    this.operator = new GridOperator();

    if (options.interactive) {
      this.handler = new GameHandler(canvas, this.state, () => this.draw());
      this.handler.onResetView = () => { this.isViewInitialized = false; };
      this.handler.onDispatch = this.dispatch.bind(this);
    }
    
    this.init();
  }

  public destroy() {
    this.isDestroyed = true;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    // Clean up resources used by the handler and drawer.
    this.handler?.destroy();
    this.drawer.destroy();
    this.handler = undefined;
  }

  set onInteract(handler: InteractionHandler | undefined) {
    if (this.handler) {
      this.handler.onInteract = handler;
    }
  }

  get onInteract() {
    return this.handler?.onInteract;
  }

  public getHandler(): GameHandler | undefined {
    return this.handler;
  }

  public setOnTogglePause(handler: () => void) {
    if (this.handler) {
      this.handler.onTogglePause = handler;
    }
  }

  public setOnToggleFastForward(handler: () => void) {
    if (this.handler) {
      this.handler.onToggleFastForward = handler;
    }
  }

  public onAlert?: AlertHandler;
  public onHint?: HintHandler;

  public setTheme(theme: 'light' | 'dark') {
    if (this.state.theme !== theme) {
      this.state.theme = theme;
      this.draw(); // Redraw with the new theme
    }
  }

  public setAnimationsEnabled(enabled: boolean) {
    this.state.animationsEnabled = enabled;
  }

  public setRenderCanvasText(enabled: boolean) {
    this.state.renderCanvasText = enabled;
  }

  public setZoomSensitivity(sensitivity: number) {
    this.state.zoomSensitivity = sensitivity;
  }

  public setKeyBindings(bindings: KeyBindings) {
    this.state.keyBindings = bindings;
  }

  private init() {
    GridLoader.loadInitialData(this.state);
  }

  public setDefaults(resetView = true) {
    GridLoader.resetToDefaults(this.state);
    if (resetView) {
      // Flag the view to be re-initialized by the drawer on the next frame.
      this.isViewInitialized = false;
    }
  }

  public startDay(day: number) {
    this.setDefaults(false); // Don't reset view when starting a new day
    this.state.day = day;
    this.isBlackout = false;
    
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
    if (this.isBlackout) {
      return {
        performance: 'bad',
        costM: (totalCost / 1_000_000).toFixed(1),
        message: "The grid collapsed under your watch due to a catastrophic frequency drop. You've been relieved of your duties."
      };
    }
    const scenario = scenarios[day];
    if (scenario) {
        return scenario.getResultDetails(totalCost);
    }
    return null;
  }

  public dispatch(action: SimulationAction) {
    switch (action.type) {
      case 'TOGGLE_UNIT':
        this.operator.toggleUnitStatus(this.state, action.subId, action.unitIndex);
        this.draw();
        break;
      case 'TOGGLE_BRANCH':
        this.operator.toggleBranchCircuitStatus(this.state, action.branchId, action.circuitNum);
        this.draw();
        break;
      case 'SET_SETPOINT':
        this.operator.setUnitSetpoint(this.state, action.subId, action.unitIndex, action.value);
        break;
      case 'DISCONNECT_SMALLEST_LOAD':
        this.operator.disconnectSmallestLoad(this.state, this.onAlert);
        break;
      case 'DISCONNECT_MOST_LOADED_LINE':
        this.operator.disconnectMostLoadedLine(this.state, this.onAlert);
        break;
      case 'EMERGENCY_LOAD_SHED':
        this.operator.disconnectLargestLoad(this.state, this.onAlert);
        break;
      case 'RAMP_ALL_GENERATION':
        this.operator.rampAllGenerationUp(this.state, this.onAlert);
        break;
    }
  }

  public update(steps = 1, advanceTime = true): boolean {
    for (let i = 0; i < steps; i++) {
      if (this.runGameStep(advanceTime)) {
        return true; // Day is over
      }
    }
    return false; // Day is not over
  }

  private runGameStep(advanceTime = true): boolean {
    if (this.state.t >= GameEngine.GAME_DURATION) {
      this.state.Ybus = null;
      return true; // Day finished
    }

    if (advanceTime) {
      this.state.t += 1;
    }

    this.currentScenario?.update(this.state, this.onAlert, this.onHint);

    this.contingencyManager.handleContingencies(this.state, this.onAlert);
    this.topologyAnalyzer.updateGridTopology(this.state, this.onAlert);
    
    const { PL, PGSET, PGMIN, PGMAX } = this.dispatchSolver.calculatePowerBalance(this.state);
    
    this.dispatchSolver.updateFrequency(this.state, PL, PGMIN, PGMAX, PGSET);
    
    // Check for blackout condition
    if (this.state.frequency < PhysicsConfig.FREQUENCY_BLACKOUT_THRESHOLD) {
      this.onAlert?.({ message: "Grid frequency collapsed, leading to a blackout. You've been fired.", critical: true });
      this.isBlackout = true;
      return true; // End the day immediately
    }

    const alpha = this.dispatchSolver.dispatchGeneration(this.state, PL);
    
    this.pfSolver.solve(this.state, alpha);
    this.metricsCalculator.updateMetrics(this.state);

    return false; // Day not finished
  }

  public draw(isPaused?: boolean, isFastForward?: boolean) {
    // First, ensure canvas dimensions are up-to-date. A resize might trigger a view reset.
    const wasResized = this.drawer.resizeCanvas();

    // Initialize or re-initialize the view if it's the first draw, or if the canvas was resized.
    if ((!this.isViewInitialized && this.drawer.isCanvasReady()) || wasResized) {
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
      blackout: this.isBlackout,
    } as GameStatistics & { blackout: boolean };
  }
}
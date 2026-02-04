import { GameStatistics, GameState, SimulationState, InputState, InteractionHandler, AlertHandler, HintHandler, Briefing, SubstationCategory, IScenario, ResultDetails, SimulationAction } from "./types";
import { SvgDrawer } from "./svg/drawer";
import { SvgHandler } from "./svg/handler";
import { IGridDrawer, IGridHandler } from "./interfaces";
import { activeCase } from "@/data/cases";
import { defaultKeyBindings, KeyBindings } from "./key-bindings";
import { solvePowerFlow } from "./logic/power-flow";
import { calculatePowerBalance, dispatchGeneration, updateFrequency } from "./logic/dispatch";
import { updateGridTopology, handleContingencies } from "./logic/grid-analysis";
import { updateMetrics, loadInitialData, resetToDefaults, createInitialGameMetrics } from "./logic/grid-data";
import { toggleUnitStatus, toggleBranchCircuitStatus, setUnitSetpoint, disconnectSmallestLoad, disconnectMostLoadedLine, disconnectLargestLoad, rampAllGenerationUp } from "./logic/operator";
import { PhysicsConfig, ViewConfig } from "./config";

function createInitialSimulationState(): SimulationState {
  return {
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
  };
}

function createInitialInputState(): InputState {
  return {
    inDrag: false,
    dragstartX: 0,
    dragstartY: 0,
    dragorigX: 0,
    dragorigY: 0,
    hoverBranch: null,
    hoverSub: null,
  };
}

export class GameEngine {
  private drawer: IGridDrawer;
  private handler?: IGridHandler;
  private currentScenario: IScenario | null = null;
  private animationFrameId?: number;
  private isViewInitialized = false;
  public static readonly GAME_DURATION = 600;
  private isBlackout = false;

  // Simulation State (formerly G)
  public state: GameState = {
    // Game Loop Vars
    ...createInitialSimulationState(),
    ...createInitialInputState(),

    // View State
    xmax: activeCase.mapConfig.bounds.xMax,
    xmin: activeCase.mapConfig.bounds.xMin,
    ymax: activeCase.mapConfig.bounds.yMax,
    ymin: activeCase.mapConfig.bounds.yMin,
    scale_max: ViewConfig.ZOOM_LIMIT_MAX,
    scale_min: 0, // Will be set dynamically by drawer
    scaleX: activeCase.mapConfig.initialView.scale,
    scaleY: activeCase.mapConfig.initialView.scale,
    x0: activeCase.mapConfig.initialView.x0,
    y0: activeCase.mapConfig.initialView.y0,
    theme: 'dark',
    animationsEnabled: true,
    renderMapLabels: true,
    zoomSensitivity: ViewConfig.ZOOM_SENSITIVITY_DEFAULT,
    debug_draw_map_bounds: false,
    keyBindings: defaultKeyBindings,
  };

  constructor(element: HTMLDivElement, options: { interactive?: boolean } = { interactive: true }) {
    const svgDrawer = new SvgDrawer(element);
    this.drawer = svgDrawer;

    if (options.interactive !== false) {
      const svgHandler = new SvgHandler(svgDrawer.svgElement, this.state);
      svgHandler.onResetView = () => { this.isViewInitialized = false; };
      svgHandler.onDispatch = this.dispatch.bind(this);
      this.handler = svgHandler;
    }

    this.init();
  }

  public destroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
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

  public getHandler(): IGridHandler | undefined {
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

  public setRenderMapLabels(enabled: boolean) {
    this.state.renderMapLabels = enabled;
  }

  public setZoomSensitivity(sensitivity: number) {
    this.state.zoomSensitivity = sensitivity;
  }

  public setKeyBindings(bindings: KeyBindings) {
    this.state.keyBindings = bindings;
  }

  private init() {
    loadInitialData(this.state);
  }

  public setDefaults(resetView = true) {
    resetToDefaults(this.state);
    if (resetView) {
      this.isViewInitialized = false;
    }
  }

  public startDay(day: number) {
    this.setDefaults(false); // Don't reset view when starting a new day
    this.state.day = day;
    this.isBlackout = false;

    this.currentScenario = activeCase.scenarios[day] || null;
    if (this.currentScenario) {
      this.currentScenario.start(this.state, this.onAlert, this.onHint);
    } else {
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
    const scenario = activeCase.scenarios[day] || null;
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
    const scenario = activeCase.scenarios[day];
    if (scenario) {
        return scenario.getResultDetails(totalCost);
    }
    return null;
  }

  public dispatch(action: SimulationAction) {
    switch (action.type) {
      case 'TOGGLE_UNIT':
        toggleUnitStatus(this.state, action.subId, action.unitIndex);
        this.draw();
        break;
      case 'TOGGLE_BRANCH':
        toggleBranchCircuitStatus(this.state, action.branchId, action.circuitNum);
        this.draw();
        break;
      case 'SET_SETPOINT':
        setUnitSetpoint(this.state, action.subId, action.unitIndex, action.value);
        break;
      case 'DISCONNECT_SMALLEST_LOAD':
        disconnectSmallestLoad(this.state, this.onAlert);
        break;
      case 'DISCONNECT_MOST_LOADED_LINE':
        disconnectMostLoadedLine(this.state, this.onAlert);
        break;
      case 'EMERGENCY_LOAD_SHED':
        disconnectLargestLoad(this.state, this.onAlert);
        break;
      case 'RAMP_ALL_GENERATION':
        rampAllGenerationUp(this.state, this.onAlert);
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

    handleContingencies(this.state, this.onAlert);
    updateGridTopology(this.state, this.onAlert);

    const { PL, PGSET, PGMIN, PGMAX } = calculatePowerBalance(this.state);

    updateFrequency(this.state, PL, PGMIN, PGMAX, PGSET);

    // Check for blackout condition
    if (this.state.frequency < PhysicsConfig.FREQUENCY_BLACKOUT_THRESHOLD) {
      this.onAlert?.({ message: "Grid frequency collapsed, leading to a blackout. You've been fired.", critical: true });
      this.isBlackout = true;
      return true; // End the day immediately
    }

    const alpha = dispatchGeneration(this.state, PL);

    solvePowerFlow(this.state, alpha);
    updateMetrics(this.state);

    return false; // Day not finished
  }

  public draw(isPaused?: boolean, isFastForward?: boolean) {
    this.drawer.resizeCanvas();

    if (!this.isViewInitialized && this.drawer.isCanvasReady()) {
      this.drawer.setInitialView(this.state);
      this.isViewInitialized = true;
    }
    // On resize, updateWorldTransform (called inside draw) will recalculate
    // scale_min, clamp scale, and apply view bounds — no need to reset the view.
    this.drawer.draw(this.state, isPaused ?? true, isFastForward ?? false);
  }

  public getDashboardStats(): GameStatistics {
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

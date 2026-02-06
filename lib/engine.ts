import { GameState, GridCase, StatsSnapshot, InteractionHandler, AlertHandler, Alert, HintHandler, Hint, Briefing, IScenario, ResultDetails, SimulationAction, EngineSettings } from "./types";

enum PlaybackMode { PAUSED = "PAUSED", PLAYING = "PLAYING", FAST_FORWARD = "FAST_FORWARD" }
import { GridModel, IGridModel } from "./model/grid-model";
import { GridView, IGridView } from "./view/grid-view";
import { defaultKeyBindings, GameAction } from "./key-bindings";
import { emptyMetrics } from "./model/grid-data";
import { BASE_FREQUENCY } from "./model/constants";
import { ViewConfig } from "./config";

const TICK_SPEED_NORMAL_MS = 500;
const TICK_SPEED_FAST_MS = 50;
import { formatGameTime } from "./utils";

export class GameEngine {
  // --- Core ---
  private readonly gridCase: GridCase;
  private view: IGridView;
  private model: IGridModel;
  public state!: GameState;

  // --- Day lifecycle ---
  private currentScenario: IScenario | null = null;
  private _dayPhase: 'briefing' | 'playing' | 'results' = 'briefing';
  private _targetDay = 1;
  private _dayTransitionId = 0;
  private _lastResults: ResultDetails | null = null;
  private _lastResultStats: StatsSnapshot | null = null;
  private _isBlackout = false;

  // --- Playback ---
  private _playback: PlaybackMode = PlaybackMode.PAUSED;
  private _modalPaused = false;
  private rafId?: number;

  // --- Alerts & Hints ---
  private _nextAlertId = 0;
  private _nextHintId = 0;
  private _alerts: Alert[] = [];
  private _hints: Hint[] = [];
  private readonly alertHandler: AlertHandler = (a, reset) => {
    const entry: Alert = { id: this._nextAlertId++, time: formatGameTime(this.state.t), ...a };
    this._alerts = reset ? [entry] : [entry, ...this._alerts];
    this.notify();
  };
  private readonly hintHandler: HintHandler = (h, reset) => {
    const entry: Hint = { id: this._nextHintId++, time: formatGameTime(this.state.t), ...h };
    this._hints = reset ? [entry] : [entry, ...this._hints];
    this.notify();
  };

  // --- Subscriptions ---
  private listeners = new Set<() => void>();
  private cachedStats: StatsSnapshot | null = null;
  private statsVersion = -1;

  // --- Getters ---
  get dayPhase() { return this._dayPhase; }
  get targetDay() { return this._targetDay; }
  get dayTransitionId() { return this._dayTransitionId; }
  get lastResults() { return this._lastResults; }
  get lastResultStats() { return this._lastResultStats; }
  get currentBriefing(): Briefing | null { return this.gridCase.scenarios[this._targetDay]?.briefing || null; }
  get isBlackout() { return this._isBlackout; }
  get isPaused() { return this._playback === PlaybackMode.PAUSED || this._modalPaused; }
  get userPaused() { return this._playback === PlaybackMode.PAUSED; }
  set userPaused(v: boolean) { this._playback = v ? PlaybackMode.PAUSED : PlaybackMode.PLAYING; this.notify(); }
  get isFastForward() { return this._playback === PlaybackMode.FAST_FORWARD; }
  get alerts() { return this._alerts; }
  get hints() { return this._hints; }

  constructor(element: HTMLDivElement, gridCase: GridCase, options: { interactive?: boolean } = { interactive: true }) {
    this.gridCase = gridCase;
    const { bounds, initialView } = gridCase.mapConfig;

    this.state = {
      // SimState
      _vSim: 0, t: 0, day: 1, frequency: BASE_FREQUENCY,
      subs: {}, branches: {}, borders: [], nsubs: 0,
      referenceBus: "1", refIdx: -1, Ybus: null, Yinv: null,
      metrics: emptyMetrics(), frLoad: 1, frWind: 1, frSolar: 1,
      // InputState
      inDrag: false, dragStartX: 0, dragStartY: 0, dragOrigX: 0, dragOrigY: 0,
      hoverBranch: null, hoverCircuit: null, hoverSub: null,
      // ViewState
      xmax: bounds.xMax, xmin: bounds.xMin, ymax: bounds.yMax, ymin: bounds.yMin,
      scaleMax: ViewConfig.ZOOM_LIMIT_MAX, scaleMin: 0,
      scaleX: initialView.scale, scaleY: initialView.scale, referenceScale: initialView.scale,
      x0: initialView.x0, y0: initialView.y0,
      theme: 'dark', animationsEnabled: true, renderMapLabels: true,
      zoomSensitivity: ViewConfig.ZOOM_SENSITIVITY_DEFAULT, keyBindings: defaultKeyBindings,
    };

    this.view = new GridView(element, options.interactive !== false);
    this.view.init(this.state, {
      onDispatch: this.dispatch.bind(this),
      onTogglePause: () => this.togglePause(),
      onToggleFastForward: () => this.toggleFastForward(),
    });

    this.model = new GridModel();
    this.model.init(this.state, gridCase.gridData, gridCase.referenceBus);
  }

  // --- Subscriptions ---

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  private notify() { for (const l of this.listeners) l(); }

  getStats(): StatsSnapshot {
    if (this.state._vSim === this.statsVersion && this.cachedStats) return this.cachedStats;
    this.cachedStats = { ...this.model.getStats(), blackout: this._isBlackout };
    this.statsVersion = this.state._vSim;
    return this.cachedStats;
  }

  // --- Day Lifecycle ---

  navigateToDay(day: number) {
    this._targetDay = day;
    this._dayPhase = 'briefing';
    this._playback = PlaybackMode.PAUSED;
    this._dayTransitionId++;
    this.notify();
  }

  beginDay() {
    this.clearAlerts();
    this.startDay(this._targetDay);
    this.step(false);
    this._playback = PlaybackMode.PLAYING;
    this._dayPhase = 'playing';
    this._dayTransitionId++;
    this.notify();
  }

  advanceToNextDay() {
    const totalDays = Object.keys(this.gridCase.scenarios).length;
    this.navigateToDay(this._targetDay < totalDays ? this._targetDay + 1 : 1);
  }

  getBriefingForDay(day: number): Briefing | null {
    return this.gridCase.scenarios[day]?.briefing || null;
  }

  // --- Playback ---

  togglePause() {
    this._playback = this._playback === PlaybackMode.PAUSED ? PlaybackMode.PLAYING : PlaybackMode.PAUSED;
    this.notify();
  }

  toggleFastForward() {
    this._playback = this._playback === PlaybackMode.FAST_FORWARD ? PlaybackMode.PLAYING : PlaybackMode.FAST_FORWARD;
    this.notify();
  }

  setModalPaused(v: boolean) {
    if (this._modalPaused !== v) { this._modalPaused = v; this.notify(); }
  }

  // --- Alerts & Hints ---

  dismissAlert(id: number) { this._alerts = this._alerts.filter(a => a.id !== id); this.notify(); }
  dismissAllAlerts() { this._alerts = []; this.notify(); }
  dismissHint(id: number) { this._hints = this._hints.filter(h => h.id !== id); this.notify(); }
  dismissAllHints() { this._hints = []; this.notify(); }
  clearAlerts() { this._alerts = []; this._hints = []; this.notify(); }

  // --- View Delegation ---

  reparent(container: HTMLDivElement) { this.view.reparent(container); }
  performAction(action: GameAction) { this.view.performAction(action); }
  applySettings(s: EngineSettings) { this.view.applySettings(s); }
  set onInteract(handler: InteractionHandler | undefined) { this.view.onInteract = handler; }
  draw() { this.view.draw(this.isPaused, this.isFastForward); }

  // --- Simulation ---

  dispatch(action: SimulationAction) {
    this.model.dispatch(action, this.alertHandler);
    this.notify();
  }

  step(advanceTime = true) {
    const result = this.model.tick(advanceTime, this.alertHandler, this.hintHandler);
    if (result.blackout) {
      this.alertHandler({ message: "Grid frequency collapsed, leading to a blackout. You've been fired.", critical: true });
      this._isBlackout = true;
    }
    if (result.dayComplete) { this.completeDayWithResults(); return; }
    this.notify();
  }

  // --- Lifecycle ---

  startLoop() {
    if (this.rafId) return;
    let lastGameStepTime = 0;
    const loop = (timestamp: number) => {
      if (!this.isPaused) {
        const speed = this.isFastForward ? TICK_SPEED_FAST_MS : TICK_SPEED_NORMAL_MS;
        if (timestamp - lastGameStepTime > speed) { this.step(); lastGameStepTime = timestamp; }
      }
      this.draw();
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  destroy() {
    if (this.rafId) { cancelAnimationFrame(this.rafId); this.rafId = undefined; }
    this.listeners.clear();
    this.view.destroy();
  }

  startDay(day: number) {
    this._isBlackout = false;
    this.currentScenario = this.gridCase.scenarios[day] || null;
    if (!this.currentScenario) {
      this.alertHandler({ message: `Scenario for Day ${day} is not defined.`, critical: true }, true);
    }
    this.model.startDay(day, this.currentScenario, this.alertHandler, this.hintHandler);
    this.notify();
  }

  private completeDayWithResults() {
    const stats = this.getStats();
    this._lastResults = this.getResultsForDay(this.state.day, stats.totalCost);
    this._lastResultStats = stats;
    this._dayPhase = 'results';
    this._playback = PlaybackMode.PAUSED;
    this._dayTransitionId++;
    this.notify();
  }

  private getResultsForDay(day: number, totalCost: number): ResultDetails | null {
    if (this._isBlackout) {
      return {
        performance: 'bad',
        costM: (totalCost / 1_000_000).toFixed(1),
        message: "The grid collapsed under your watch due to a catastrophic frequency drop. You've been relieved of your duties."
      };
    }
    return this.gridCase.scenarios[day]?.getResultDetails(totalCost) ?? null;
  }
}


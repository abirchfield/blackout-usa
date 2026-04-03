import { GameState, GridCase, StatsSnapshot, InteractionHandler, Alert, Hint, GridModelApi, Scenario, ResultDetails, EngineSettings, GameAction, TimeConfig } from "./types";
import { GridModel, emptyCumulative } from "./grid/grid";
import { GridView, GridViewApi } from "./view/grid-view";
import { BASE_FREQUENCY, GAME_DURATION_S, SECONDS_PER_TICK, FREQUENCY_BLACKOUT_THRESHOLD, TICK_SPEED_NORMAL_MS, TICK_SPEED_FAST_MS, DEFAULT_START_HOUR } from "./grid/constants";
import { ViewConfig, defaultKeyBindings } from "./view/constants";
import { WeatherModel } from "./weather";
import { formatGameTime } from "./utils";
import { ForecastData, computeForecast } from "./weather/forecast";

type Playback = 'paused' | 'playing' | 'fast';

const DEFAULT_TIME_CONFIG: TimeConfig = { startHour: DEFAULT_START_HOUR };

// Result message templates
const MSG_BLACKOUT = "The grid collapsed under your watch due to a catastrophic frequency drop. You've been relieved of your duties.";
const MSG_RECORD = (record: string) => `Amazing!! This is better than the prior record, $${record}M.\nSuper job managing the grid today and keeping costs low`;
const MSG_GOOD = (record: string) => `Great job! The record for this scenario is $${record}M.\nSuper job managing the grid today and keeping costs low`;
const MSG_OKAY = (good: string) => `Not too bad. We would hope to keep the cost under $${good}M for this scenario.\nFeel free to give it another try`;
const MSG_BAD = (good: string) => `That's too high! We would hope to keep the cost under $${good}M for this scenario.\nFeel free to give it another try`;
const ISO_BASE_YEAR = 2026;
const ISO_BASE_MONTH = 1;

/** Build the initial game state from a grid case definition. Pure factory — no side effects. */
function buildInitialState(gc: GridCase): GameState {
  const { bounds } = gc.mapConfig;
  const gd = gc.gridData;
  const refSub = Object.values(gd.subs).find(s => s.Name === gc.referenceBus);
  if (!refSub) throw new Error(`referenceBus "${gc.referenceBus}" not found in substations`);
  const refBusNum = refSub.Number;
  return {
    _vSim: 0, t: 0, frequency: BASE_FREQUENCY,
    subs: structuredClone(gd.subs),
    branches: structuredClone(gd.branches),
    borders: gd.borders,
    nsubs: gd.nsubs,
    referenceBus: refBusNum,
    refIdx: parseInt(refBusNum) - 1,
    subList: [], genSubs: [], loadSubs: [], renewableSubs: [], branchList: [],
    cumulative: emptyCumulative(), loadLevel: 1, windAvail: 1, sunAvail: 1,
    inDrag: false, dragStartX: 0, dragStartY: 0, dragOrigX: 0, dragOrigY: 0,
    hoverBranch: null, hoverSub: null,
    xmax: bounds.xMax, xmin: bounds.xMin, ymax: bounds.yMax, ymin: bounds.yMin,
    scaleMax: gc.mapConfig.zoomMax ?? 0, scaleMin: 0,
    scaleX: 0, scaleY: 0, referenceScale: 0,
    x0: 0, y0: 0,
    theme: 'dark', animationsEnabled: true, renderMapLabels: true,
    zoomSensitivity: ViewConfig.ZOOM_SENSITIVITY_DEFAULT, keyBindings: defaultKeyBindings,
  };
}

/** Assemble a StatsSnapshot from engine state. Pure function — no side effects. */
function computeStats(
  instant: GridModelApi['instant'],
  cumulative: GameState['cumulative'],
  t: number, startHour: number, day: number,
  frequency: number, windAvail: number, sunAvail: number,
  isBlackout: boolean,
): StatsSnapshot {
  return {
    ...instant,
    ...cumulative,
    timeStr: formatGameTime(t, startHour),
    timeIso: toIsoGameTime(t, startHour, day),
    timeStep: t, frequency, windAvail, sunAvail, day,
    blackout: isBlackout,
  };
}

/** Build a valid ISO datetime for machine-readable <time datetime> metadata. */
function toIsoGameTime(t: number, startHour: number, day: number): string {
  const totalMinutes = startHour * 60 + Math.floor(t / 60);
  const hour24 = Math.floor(totalMinutes / 60) % 24;
  const minute = totalMinutes % 60;
  const dd = String(Math.max(1, day)).padStart(2, '0');
  const hh = String(hour24).padStart(2, '0');
  const mm = String(minute).padStart(2, '0');
  return `${ISO_BASE_YEAR}-${String(ISO_BASE_MONTH).padStart(2, '0')}-${dd}T${hh}:${mm}:00`;
}

/** Top-level game engine: owns the simulation loop, grid model, weather, and view layer. */
export class GameEngine {
  // --- Core ---
  private readonly gridCase: GridCase;
  private readonly timeConfig: TimeConfig;
  private readonly _latitude: number;
  private view: GridViewApi;
  private readonly grid: GridModelApi;
  private weather: WeatherModel;
  public state: GameState;
  private _stats!: StatsSnapshot;
  get stats(): StatsSnapshot { return this._stats; }
  get caseName(): string { return this.gridCase.name; }

  // --- Forecast ---
  private _forecast: ForecastData | null = null;

  // --- Day lifecycle ---
  // navigateToDay → briefing, startDay → playing, completeDayWithResults → results
  private _dayPhase: 'briefing' | 'playing' | 'results' = 'briefing';
  private _scenario: Scenario | null = null;
  private _targetDay = 1;
  private _dayVersion = 0;
  private _lastResults: ResultDetails | null = null;
  private _lastResultStats: StatsSnapshot | null = null;
  private _isBlackout = false;

  // --- Playback ---
  private _playback: Playback = 'paused';
  private _externalPaused = false;
  private rafId?: number;

  // --- Alerts & Hints ---
  private _nextNotifId = 0;
  private _alerts: Alert[] = [];
  private _hints: Hint[] = [];

  private addNotification<T>(list: T[], payload: Omit<T, 'id' | 'time'>, reset?: boolean): T[] {
    const entry = { id: this._nextNotifId++, time: this.fmtTime(), ...payload } as T;
    return reset ? [entry] : [entry, ...list];
  }

  private addAlert = (a: { message: string; critical: boolean }, reset?: boolean) => {
    this._alerts = this.addNotification(this._alerts, a, reset);
    this._fireListeners();
  };

  private addHint = (h: { message: string }, reset?: boolean) => {
    this._hints = this.addNotification(this._hints, h, reset);
    this._fireListeners();
  };

  // --- Subscriptions ---
  private listeners = new Set<() => void>();

  // --- Getters ---
  get dayPhase() { return this._dayPhase; }
  get targetDay() { return this._targetDay; }
  get dayVersion() { return this._dayVersion; }
  get lastResults() { return this._lastResults; }
  get lastResultStats() { return this._lastResultStats; }
  get currentInfo(): string[] | null { return this.infoForDay(this._targetDay); }
  get isBlackout() { return this._isBlackout; }
  get forecast(): ForecastData | null { return this._forecast; }
  get isPaused() { return this._playback === 'paused' || this._externalPaused; }
  get userPaused() { return this._playback === 'paused'; }
  get isFastForward() { return this._playback === 'fast'; }
  get alerts() { return this._alerts; }
  get hints() { return this._hints; }

  constructor(element: HTMLDivElement, gridCase: GridCase, options: { interactive?: boolean } = { interactive: true }) {
    this.gridCase = gridCase;
    this.timeConfig = gridCase.timeConfig ?? DEFAULT_TIME_CONFIG;
    this.state = buildInitialState(gridCase);

    this.grid = new GridModel(this.state);
    this.grid.setup();

    const { bounds } = gridCase.mapConfig;
    this._latitude = (bounds.yMin + bounds.yMax) / 2;
    this.weather = new WeatherModel(this.state, this.timeConfig, this._latitude);
    this.weather.setup();

    this.view = new GridView(element, options.interactive !== false, gridCase.name);
    this.view.init(this.state, {
      onTripHottestLine: () => { this.grid.disconnectHottestLine(); this.commit(); },
      onShedMinLoad:     () => { this.grid.shedMinLoad();     this.commit(); },
      onShedMaxLoad:     () => { this.grid.shedMaxLoad();     this.commit(); },
      onRampAllUp:       () => { this.grid.rampAllUp();       this.commit(); },
      onTogglePause:     () => this.togglePause(),
      onToggleFastForward: () => this.toggleFastForward(),
    });

    this.refreshStats();
  }

  // --- Subscriptions ---

  /** Register a listener called on every state change; returns an unsubscribe function. */
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  /** Low-level: dispatch to all listeners. Does NOT bump _vSim or refresh stats. */
  private _fireListeners() { for (const l of this.listeners) l(); }

  /** Simulation state changed. Refresh stats snapshot, bump version, fire listeners. */
  commit() { this.refreshStats(); this.state._vSim++; this._fireListeners(); }

  private fmtTime(): string { return formatGameTime(this.state.t, this.timeConfig.startHour); }

  private refreshStats() {
    this._stats = computeStats(
      this.grid.instant, this.state.cumulative,
      this.state.t, this.timeConfig.startHour, this._targetDay,
      this.state.frequency, this.state.windAvail, this.state.sunAvail,
      this._isBlackout,
    );
  }

  // --- Day Lifecycle ---

  /** Load a scenario day: reset grid/weather, compute forecast, show briefing. */
  navigateToDay(day: number) {
    this._targetDay = day;
    this._dayPhase = 'briefing';
    this._playback = 'paused';
    this._isBlackout = false;
    this.state.t = 0;
    this._forecast = computeForecast(
      this.gridCase.scenarios[day]?.weather,
      this.timeConfig.startHour,
      this._latitude,
    );

    this.clearAlerts();
    this._scenario = this.gridCase.scenarios[day] ?? null;

    // Always initialize a deterministic baseline state for the selected day.
    this.grid.reset(this.addAlert, this.addHint);
    this.weather.setModels(this._scenario?.weather);
    this.weather.reset();
    this.grid.initRenewableOutput();

    if (!this._scenario) {
      this.addAlert({ message: `Scenario for Day ${day} is not defined.`, critical: true }, true);
      // Solve one baseline step so stats and map stay coherent for missing scenarios.
      this.weather.tick(0);
      this.grid.tick(0);
      this._dayVersion++;
      this.commit();
      return;
    } else {
      this._scenario.start?.(0, this.grid, this.weather, this.timeConfig.startHour);

      if (this._scenario.hints) {
        for (let i = 0; i < this._scenario.hints.length; i++) {
          this.addHint({ message: this._scenario.hints[i] }, i === 0);
        }
      }

      // Solve initial power flow (dt=0: solver runs, time doesn't advance)
      this._scenario.update?.(0, this.grid, this.weather, this.timeConfig.startHour);
      this.weather.tick(0);
      this.grid.tick(0);
    }

    this._dayVersion++;
    this.commit();
  }

  /** Transition from briefing to live simulation. */
  startDay() {
    if (this._dayPhase !== 'briefing') return;
    this._playback = 'playing';
    this._dayPhase = 'playing';
    this._dayVersion++;
    this.commit();
  }

  /** Navigate to the next scenario day (wraps to day 1). */
  advanceToNextDay() {
    const days = this.getOrderedScenarioDays();
    if (days.length === 0) return;
    const idx = days.indexOf(this._targetDay);
    const next = idx >= 0 ? days[(idx + 1) % days.length] : days[0];
    this.navigateToDay(next);
  }

  private infoForDay(day: number): string[] | null {
    return this.gridCase.scenarios[day]?.info?.slice() || null;
  }

  // --- Playback ---

  private isPlayingPhase() {
    return this._dayPhase === 'playing';
  }

  private getOrderedScenarioDays(): number[] {
    return Object.keys(this.gridCase.scenarios)
      .map(Number)
      .filter((n) => Number.isInteger(n))
      .sort((a, b) => a - b);
  }

  /** Toggle between paused and playing. */
  togglePause() {
    if (!this.isPlayingPhase()) return;
    this._playback = this._playback === 'paused' ? 'playing' : 'paused';
    this._fireListeners();
  }

  /** Toggle between fast-forward and normal speed. */
  toggleFastForward() {
    if (!this.isPlayingPhase()) return;
    this._playback = this._playback === 'fast' ? 'playing' : 'fast';
    this._fireListeners();
  }

  set externalPaused(v: boolean) {
    if (this._externalPaused !== v) { this._externalPaused = v; this._fireListeners(); }
  }

  // --- Alerts & Hints ---

  private dismissById<T extends { id: number }>(list: T[], id: number): T[] {
    return list.filter(item => item.id !== id);
  }

  /** Dismiss a single alert by ID. */
  dismissAlert(id: number) { this._alerts = this.dismissById(this._alerts, id); this._fireListeners(); }
  /** Dismiss all alerts. */
  dismissAllAlerts() { this._alerts = []; this._fireListeners(); }
  /** Dismiss a single hint by ID. */
  dismissHint(id: number) { this._hints = this.dismissById(this._hints, id); this._fireListeners(); }
  /** Dismiss all hints. */
  dismissAllHints() { this._hints = []; this._fireListeners(); }
  /** Clear all alerts and hints (internal use — called during day navigation). */
  private clearAlerts() { this._alerts = []; this._hints = []; this._fireListeners(); }

  // --- Operator Actions ---

  /** Toggle a generator unit on/off and commit. */
  toggleUnit(subId: string, unitIndex: number) { this.grid.toggleUnit(subId, unitIndex); this.commit(); }
  /** Toggle a load unit on/off and commit. */
  toggleLoadUnit(subId: string, unitIndex: number) { this.grid.toggleLoadUnit(subId, unitIndex); this.commit(); }
  /** Cancel an in-progress startup/shutdown and commit. */
  abortTransition(subId: string, unitIndex: number) { this.grid.abortTransition(subId, unitIndex); this.commit(); }
  /** Open or close a transmission branch and commit. */
  toggleBranch(branchId: string) { this.grid.toggleBranch(branchId); this.commit(); }
  /** Set a generator's target power output and commit. */
  setSetpoint(subId: string, unitIndex: number, value: number) { this.grid.setSetpoint(subId, unitIndex, value); this.commit(); }

  // --- View Delegation ---

  /** Move the canvas to a new container element. */
  reparent(container: HTMLDivElement) { this.view.reparent(container); }
  /** Forward a game action (pan, zoom, emergency op) to the view layer. */
  performAction(action: GameAction) { this.view.performAction(action); }
  /** Push settings changes (theme, animations, keybindings) into the view. */
  applySettings(s: EngineSettings) { this.view.applySettings(s); }
  set onInteract(handler: InteractionHandler | undefined) { this.view.onInteract = handler; }
  /** Render one frame of the grid map. */
  draw() { this.view.draw(this.isPaused, this.isFastForward); }

  // --- Simulation Tick ---

  /** Advance simulation by one time step; triggers blackout/day-end checks. */
  tick() {
    if (!this.isPlayingPhase()) return;
    this.state.t += SECONDS_PER_TICK;

    this._scenario?.update?.(this.state.t, this.grid, this.weather, this.timeConfig.startHour);
    this.weather.tick(1);
    this.grid.tick(1);

    if (this.state.frequency < FREQUENCY_BLACKOUT_THRESHOLD) {
      this._isBlackout = true;
      this.addAlert({ message: "Grid frequency collapsed, leading to a blackout. You've been fired.", critical: true });
      this.grid.invalidate();
      this.completeDayWithResults();
      return;
    }

    if (this.state.t >= GAME_DURATION_S) {
      this.grid.invalidate();
      this.completeDayWithResults();
      return;
    }

    this.commit();
  }

  // --- Lifecycle ---

  /** Start the requestAnimationFrame game loop. */
  startLoop() {
    if (this.rafId) return;
    let lastGameStepTime = -1;
    const loop = (timestamp: number) => {
      if (lastGameStepTime < 0) lastGameStepTime = timestamp;
      if (!this.isPaused) {
        const speed = this.isFastForward ? TICK_SPEED_FAST_MS : TICK_SPEED_NORMAL_MS;
        if (timestamp - lastGameStepTime > speed) { this.tick(); lastGameStepTime = timestamp; }
      }
      this.draw();
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  /** Tear down engine: cancel rAF, clear listeners, destroy view. */
  destroy() {
    if (this.rafId) { cancelAnimationFrame(this.rafId); this.rafId = undefined; }
    this.listeners.clear();
    this.view.destroy();
  }

  private completeDayWithResults() {
    if (this._dayPhase !== 'playing') return;
    this.refreshStats();
    this._lastResults = this.getResultsForDay(this._targetDay, this.stats.totalCost);
    this._lastResultStats = this.stats;
    this._dayPhase = 'results';
    this._playback = 'paused';
    this._dayVersion++;
    this.commit();
  }

  private getResultsForDay(day: number, totalCost: number): ResultDetails | null {
    const costM = totalCost / 1_000_000;
    if (this._isBlackout) {
      return { performance: 'blackout', costM: costM.toFixed(1), message: MSG_BLACKOUT };
    }
    const scenario = this.gridCase.scenarios[day];
    if (!scenario) return null;
    const { record, good, okay } = scenario.costs;
    const fmt = costM.toFixed(2);
    if (costM < record) return { performance: 'record', costM: fmt, message: MSG_RECORD(record.toFixed(2)) };
    if (costM < good)   return { performance: 'good',   costM: fmt, message: MSG_GOOD(record.toFixed(2)) };
    if (costM < okay)   return { performance: 'okay',   costM: fmt, message: MSG_OKAY(good.toFixed(2)) };
    return { performance: 'bad', costM: fmt, message: MSG_BAD(good.toFixed(2)) };
  }
}

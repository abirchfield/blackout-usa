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

export class GameEngine {
  // --- Core ---
  private readonly gridCase: GridCase;
  private readonly timeConfig: TimeConfig;
  private readonly _latitude: number;
  private view: GridViewApi;
  private readonly grid: GridModelApi;
  private weather: WeatherModel;
  public state: GameState;
  public stats!: StatsSnapshot;

  // --- Forecast ---
  private _forecast: ForecastData | null = null;

  // --- Day lifecycle ---
  // navigateToDay → briefing, startDay → playing, completeDayWithResults → results
  private _dayPhase: 'briefing' | 'playing' | 'results' = 'briefing';
  private _scenario: Scenario | null = null;
  private _targetDay = 1;
  private _dayTransitionId = 0;
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
    this.notify();
  };

  private addHint = (h: { message: string }, reset?: boolean) => {
    this._hints = this.addNotification(this._hints, h, reset);
    this.notify();
  };

  // --- Subscriptions ---
  private listeners = new Set<() => void>();

  // --- Getters ---
  get dayPhase() { return this._dayPhase; }
  get targetDay() { return this._targetDay; }
  get dayTransitionId() { return this._dayTransitionId; }
  get lastResults() { return this._lastResults; }
  get lastResultStats() { return this._lastResultStats; }
  get currentInfo(): string[] | null { return this.gridCase.scenarios[this._targetDay]?.info?.slice() || null; }
  get isBlackout() { return this._isBlackout; }
  get forecast(): ForecastData | null { return this._forecast; }
  get isPaused() { return this._playback === 'paused' || this._externalPaused; }
  get userPaused() { return this._playback === 'paused'; }
  set userPaused(v: boolean) { this._playback = v ? 'paused' : 'playing'; this.notify(); }
  get isFastForward() { return this._playback === 'fast'; }
  get alerts() { return this._alerts; }
  get hints() { return this._hints; }

  constructor(element: HTMLDivElement, gridCase: GridCase, options: { interactive?: boolean } = { interactive: true }) {
    this.gridCase = gridCase;
    this.timeConfig = gridCase.timeConfig ?? DEFAULT_TIME_CONFIG;
    this.state = this.buildInitialState(gridCase);

    this.grid = new GridModel(this.state);
    this.grid.setup();

    const { bounds } = gridCase.mapConfig;
    this._latitude = (bounds.yMin + bounds.yMax) / 2;
    this.weather = new WeatherModel(this.state, this.timeConfig, this._latitude);
    this.weather.setup();

    this.view = new GridView(element, options.interactive !== false);
    this.view.init(this.state, {
      onTripHottestLine: () => { this.grid.disconnectHottestLine(); this.commit(); },
      onShedMinLoad:     () => { this.grid.shedMinLoad();     this.commit(); },
      onShedMaxLoad:     () => { this.grid.shedMaxLoad();     this.commit(); },
      onRampAllUp:       () => { this.grid.rampAllUp();       this.commit(); },
      onTogglePause:     () => this.togglePause(),
      onToggleFastForward: () => this.toggleFastForward(),
    });

    this.updateStats();
  }

  private buildInitialState(gc: GridCase): GameState {
    const { bounds } = gc.mapConfig;
    const gd = gc.gridData;
    // Resolve referenceBus name → substation Number
    const refSub = Object.values(gd.subs).find(s => s.Name === gc.referenceBus);
    if (!refSub) throw new Error(`referenceBus "${gc.referenceBus}" not found in substations`);
    const refBusNum = refSub.Number;
    return {
      // SimState
      _vSim: 0, t: 0, frequency: BASE_FREQUENCY,
      subs: structuredClone(gd.subs),
      branches: structuredClone(gd.branches),
      borders: gd.borders,
      nsubs: gd.nsubs,
      referenceBus: refBusNum,
      refIdx: parseInt(refBusNum) - 1,
      subList: [], genSubs: [], loadSubs: [], renewableSubs: [], branchList: [],
      cumulative: emptyCumulative(), loadLevel: 1, windAvail: 1, sunAvail: 1,
      // InputState
      inDrag: false, dragStartX: 0, dragStartY: 0, dragOrigX: 0, dragOrigY: 0,
      hoverBranch: null, hoverSub: null,
      // ViewState — x0/y0/scale/referenceScale/scaleMax are set by GridView.setInitialView()
      xmax: bounds.xMax, xmin: bounds.xMin, ymax: bounds.yMax, ymin: bounds.yMin,
      scaleMax: gc.mapConfig.zoomMax ?? 0, scaleMin: 0,
      scaleX: 0, scaleY: 0, referenceScale: 0,
      x0: 0, y0: 0,
      theme: 'dark', animationsEnabled: true, renderMapLabels: true,
      zoomSensitivity: ViewConfig.ZOOM_SENSITIVITY_DEFAULT, keyBindings: defaultKeyBindings,
    };
  }

  // --- Subscriptions ---

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  /** Notify UI subscribers. Stats reference unchanged — alert/playback changes won't trigger stats re-renders. */
  private notify() { for (const l of this.listeners) l(); }

  /** Simulation state changed. Refresh stats snapshot, bump version, notify UI. */
  commit() { this.updateStats(); this.state._vSim++; this.notify(); }

  private fmtTime(): string { return formatGameTime(this.state.t, this.timeConfig.startHour); }

  private updateStats() {
    this.stats = {
      ...this.grid.instant,
      ...this.state.cumulative,
      timeStr: this.fmtTime(),
      timeStep: this.state.t,
      frequency: this.state.frequency,
      windAvail: this.state.windAvail,
      sunAvail: this.state.sunAvail,
      day: this._targetDay,
      blackout: this._isBlackout,
    };
  }

  // --- Day Lifecycle ---

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

    // Load scenario and initialize grid + weather so stats are populated
    // before the player clicks "Start Day" (otherwise sidebar shows zeros).
    this.clearAlerts();
    this._scenario = this.gridCase.scenarios[day] || null;
    if (!this._scenario) {
      this.addAlert({ message: `Scenario for Day ${day} is not defined.`, critical: true }, true);
    } else {
      this.grid.reset(this.addAlert, this.addHint);
      this.weather.setModels(this._scenario.weather);
      this.weather.reset();
      this.grid.initRenewableOutput();
      this._scenario.start?.(0, this.grid, this.weather);

      if (this._scenario.hints) {
        for (let i = 0; i < this._scenario.hints.length; i++) {
          this.addHint({ message: this._scenario.hints[i] }, i === 0);
        }
      }

      // Solve initial power flow (dt=0: solver runs, time doesn't advance)
      this._scenario.update?.(0, this.grid, this.weather);
      this.weather.tick(0);
      this.grid.tick(0);
    }

    this._dayTransitionId++;
    this.commit();
  }

  startDay() {
    if (this._dayPhase !== 'briefing') return;
    this._playback = 'playing';
    this._dayPhase = 'playing';
    this._dayTransitionId++;
    this.commit();
  }

  advanceToNextDay() {
    const totalDays = Object.keys(this.gridCase.scenarios).length;
    this.navigateToDay(this._targetDay < totalDays ? this._targetDay + 1 : 1);
  }

  getInfoForDay(day: number): string[] | null {
    return this.gridCase.scenarios[day]?.info?.slice() || null;
  }

  // --- Playback ---

  togglePause() {
    this._playback = this._playback === 'paused' ? 'playing' : 'paused';
    this.notify();
  }

  toggleFastForward() {
    this._playback = this._playback === 'fast' ? 'playing' : 'fast';
    this.notify();
  }

  set externalPaused(v: boolean) {
    if (this._externalPaused !== v) { this._externalPaused = v; this.notify(); }
  }

  // --- Alerts & Hints ---

  private dismiss<T extends { id: number }>(list: T[], id: number | null): T[] {
    return id === null ? [] : list.filter(item => item.id !== id);
  }

  dismissAlert(id: number) { this._alerts = this.dismiss(this._alerts, id); this.notify(); }
  dismissAllAlerts() { this._alerts = []; this.notify(); }
  dismissHint(id: number) { this._hints = this.dismiss(this._hints, id); this.notify(); }
  dismissAllHints() { this._hints = []; this.notify(); }
  clearAlerts() { this._alerts = []; this._hints = []; this.notify(); }

  // --- Operator Actions ---

  toggleUnit(subId: string, unitIndex: number) { this.grid.toggleUnit(subId, unitIndex); this.commit(); }
  toggleLoadUnit(subId: string, unitIndex: number) { this.grid.toggleLoadUnit(subId, unitIndex); this.commit(); }
  abortTransition(subId: string, unitIndex: number) { this.grid.abortTransition(subId, unitIndex); this.commit(); }
  toggleBranch(branchId: string) { this.grid.toggleBranch(branchId); this.commit(); }
  setSetpoint(subId: string, unitIndex: number, value: number) { this.grid.setSetpoint(subId, unitIndex, value); this.commit(); }

  // --- View Delegation ---

  reparent(container: HTMLDivElement) { this.view.reparent(container); }
  performAction(action: GameAction) { this.view.performAction(action); }
  applySettings(s: EngineSettings) { this.view.applySettings(s); }
  set onInteract(handler: InteractionHandler | undefined) { this.view.onInteract = handler; }
  draw() { this.view.draw(this.isPaused, this.isFastForward); }

  // --- Simulation Tick ---

  tick() {
    this.state.t += SECONDS_PER_TICK;

    this._scenario?.update?.(this.state.t, this.grid, this.weather);
    this.weather.tick(1);
    this.grid.tick(1);

    if (this.state.t >= GAME_DURATION_S) {
      this.grid.invalidate();
      this.completeDayWithResults();
      return;
    }

    if (this.state.frequency < FREQUENCY_BLACKOUT_THRESHOLD) {
      this._isBlackout = true;
      this.addAlert({ message: "Grid frequency collapsed, leading to a blackout. You've been fired.", critical: true });
      this.grid.invalidate();
      this.completeDayWithResults();
      return;
    }

    this.commit();
  }

  // --- Lifecycle ---

  startLoop() {
    if (this.rafId) return;
    let lastGameStepTime = 0;
    const loop = (timestamp: number) => {
      if (!this.isPaused) {
        const speed = this.isFastForward ? TICK_SPEED_FAST_MS : TICK_SPEED_NORMAL_MS;
        if (timestamp - lastGameStepTime > speed) { this.tick(); lastGameStepTime = timestamp; }
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

  private completeDayWithResults() {
    if (this._dayPhase !== 'playing') return;
    this.updateStats();
    this._lastResults = this.getResultsForDay(this._targetDay, this.stats.totalCost);
    this._lastResultStats = this.stats;
    this._dayPhase = 'results';
    this._playback = 'paused';
    this._dayTransitionId++;
    this.commit();
  }

  private getResultsForDay(day: number, totalCost: number): ResultDetails | null {
    const costM = totalCost / 1_000_000;
    if (this._isBlackout) {
      return { performance: 'bad', costM: costM.toFixed(1), message: MSG_BLACKOUT };
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

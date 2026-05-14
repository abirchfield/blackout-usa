import { getContext, setContext } from 'svelte';
import type { GameEngine } from '$lib/engine';
import type { StatsSnapshot, Substation, Branch, Alert, Hint } from '$lib/types';
import type { ForecastData } from '$lib/weather/forecast';

// Engine context

const ENGINE_KEY = Symbol('engine');

/** Store the engine instance in Svelte context. */
export function setEngine(engine: GameEngine) {
  setContext(ENGINE_KEY, engine);
}

/** Retrieve the engine instance from Svelte context. */
export function getEngine(): GameEngine {
  const engine = getContext<GameEngine>(ENGINE_KEY);
  if (!engine) throw new Error('getEngine() must be used within an engine context provider');
  return engine;
}

// Snapshot helpers

/**
 * Shallow-copy each Branch so Svelte detects property changes.
 * All mutable Branch props are primitives, so spread suffices.
 * Note: sub1/sub2 are shared references to engine state — this is intentional.
 * Components only read .Name from them (immutable), and the canvas renderer
 * reads from engine.state directly, not from these snapshots.
 */
function snapBranches(src: Record<string, Branch>): Record<string, Branch> {
  const out: Record<string, Branch> = {};
  for (const key in src) out[key] = { ...src[key] };
  return out;
}

/**
 * Deep-snapshot substations so that every Unit object also gets a new reference.
 * The engine mutates Unit properties (Status, P, Pset, StatusCount) in place,
 * and Svelte's keyed loops won't re-render children unless the item ref changes.
 */
function snapSubs(src: Record<string, Substation>): Record<string, Substation> {
  const out: Record<string, Substation> = {};
  for (const key in src) {
    const sub = src[key];
    const copy: Substation = { ...sub, U: sub.U.map(u => ({ ...u })) };
    if (sub.Loads) {
      copy.Loads = { ...sub.Loads, U: sub.Loads.U.map(u => ({ ...u })) };
    }
    out[key] = copy;
  }
  return out;
}

// Reactive engine state

/**
 * Runes-based reactive bridge between the mutable GameEngine and Svelte's
 * fine-grained reactivity. Subscribes to engine notifications and updates
 * reactive fields that components can read directly (no $ prefix needed).
 *
 * - Primitives use $state (Svelte skips updates when value is unchanged).
 * - Objects use $state.raw to avoid Proxy overhead — they are always
 *   replaced wholesale, never mutated by consumers.
 * - Subs/branches use version-gated snapshots to avoid deep-copies on
 *   non-simulation notifications (alert dismissals, playback toggles).
 */
export class EngineState {
  // Primitives
  isBlackout = $state(false);
  isPaused = $state(false);
  isFastForward = $state(false);
  userPaused = $state(false);
  dayVersion = $state(0);
  dayPhase = $state<'briefing' | 'playing' | 'results'>('briefing');
  simTick = $state(-1);

  // Objects — replaced entirely each update, $state.raw avoids Proxy overhead
  stats = $state.raw({} as StatsSnapshot);
  alerts = $state.raw<Alert[]>([]);
  hints = $state.raw<Hint[]>([]);
  forecast = $state.raw<ForecastData | null>(null);
  subs = $state.raw<Record<string, Substation>>({});
  branches = $state.raw<Record<string, Branch>>({});

  #cleanup: () => void;

  constructor(engine: GameEngine) {
    this.#sync(engine);
    this.#cleanup = engine.subscribe(() => this.#sync(engine));
  }

  #sync(engine: GameEngine) {
    // Primitives — Svelte 5 skips the update when value === previous
    this.isBlackout = engine.isBlackout;
    this.isPaused = engine.isPaused;
    this.isFastForward = engine.isFastForward;
    this.userPaused = engine.userPaused;
    this.dayVersion = engine.dayVersion;
    this.dayPhase = engine.dayPhase;

    // Forecast only changes on day navigation — guard to make intent explicit
    const f = engine.forecast;
    if (f !== this.forecast) this.forecast = f;

    // Objects — $state.raw triggers only on reference change.
    // stats is a new object after commit(), same ref otherwise.
    // alerts/hints are new arrays on change, same ref otherwise.
    this.stats = engine.stats;
    this.alerts = engine.alerts;
    this.hints = engine.hints;

    // Version-gated snapshots — only re-snapshot on simulation ticks
    const v = engine.state._vSim;
    if (v !== this.simTick) {
      this.simTick = v;
      this.subs = snapSubs(engine.state.subs);
      this.branches = snapBranches(engine.state.branches);
    }
  }

  destroy() { this.#cleanup(); }
}

// Context helpers

const STATE_KEY = Symbol('engine-state');

/** Provide the reactive engine state to descendant components. */
export function setEngineState(state: EngineState) {
  setContext(STATE_KEY, state);
}

/** Retrieve the reactive engine state from context. */
export function getEngineState(): EngineState {
  const state = getContext<EngineState>(STATE_KEY);
  if (!state) throw new Error('getEngineState() must be used within an engine context provider');
  return state;
}

/**
 * Set up both engine and reactive state in Svelte context.
 * Called once during the host component's init phase.
 */
export function initEngineContext(engine: GameEngine): EngineState {
  setEngine(engine);
  const es = new EngineState(engine);
  setEngineState(es);
  return es;
}

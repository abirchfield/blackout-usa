import { getContext, setContext } from 'svelte';
import { readable, type Readable } from 'svelte/store';
import type { GameEngine } from '$lib/engine';
import type { StatsSnapshot, Substation, Branch } from '$lib/types';
import type { ForecastData } from '$lib/weather/forecast';

const ENGINE_KEY = Symbol('engine');

export function setEngine(engine: GameEngine) {
  setContext(ENGINE_KEY, engine);
}

export function getEngine(): GameEngine {
  const engine = getContext<GameEngine>(ENGINE_KEY);
  if (!engine) throw new Error('getEngine() must be used within an engine context provider');
  return engine;
}

/**
 * Create a readable Svelte store that subscribes to engine state changes.
 * The store updates whenever engine.notify() is called (after commit).
 */
export function engineStore<T>(engine: GameEngine, selector: (e: GameEngine) => T): Readable<T> {
  return readable(selector(engine), (set) => {
    return engine.subscribe(() => set(selector(engine)));
  });
}

/**
 * Snapshot a Record of mutable objects by shallow-copying each entry.
 * This produces new references so Svelte's store comparison (`safe_not_equal`)
 * detects the change and fires subscribers — even though the engine mutates
 * its state objects in place rather than replacing them.
 */
function snapBranches(src: Record<string, Branch>): Record<string, Branch> {
  const out: Record<string, Branch> = {};
  for (const key in src) out[key] = { ...src[key] };
  return out;
}

/**
 * Deep-snapshot substations so that every Unit object also gets a new reference.
 * The engine mutates Unit properties (Status, P, Pset, StatusCount) in place,
 * and Svelte's `#each` keyed loops won't re-render child components unless the
 * item reference changes.  Shallow-copying the Substation alone isn't enough
 * because sub.U would still point to the same Unit[].
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

/**
 * Version-gate an expensive snapshot selector so it only re-computes when
 * _vSim changes (simulation ticks / operator actions). Alert dismissals,
 * playback toggles, and other non-simulation notify() calls return the
 * cached value, avoiding unnecessary deep-copies and Svelte re-renders.
 */
function versionedSnap<T>(
  snap: (state: GameEngine['state']) => T,
): (e: GameEngine) => T {
  let cachedVersion = -1;
  let cachedValue: T;
  return (e: GameEngine) => {
    if (e.state._vSim !== cachedVersion) {
      cachedVersion = e.state._vSim;
      cachedValue = snap(e.state);
    }
    return cachedValue;
  };
}

/** Pre-built derived stores from an engine instance. */
export function createEngineStores(engine: GameEngine) {
  return {
    stats: engineStore<StatsSnapshot>(engine, e => e.stats),
    isBlackout: engineStore<boolean>(engine, e => e.isBlackout),
    alerts: engineStore(engine, e => e.alerts),
    hints: engineStore(engine, e => e.hints),
    isPaused: engineStore<boolean>(engine, e => e.isPaused),
    isFastForward: engineStore<boolean>(engine, e => e.isFastForward),
    userPaused: engineStore<boolean>(engine, e => e.userPaused),
    dayTransitionId: engineStore<number>(engine, e => e.dayTransitionId),
    forecast: engineStore<ForecastData | null>(engine, e => e.forecast),
    simTick: engineStore<number>(engine, e => e.state._vSim),
    subs: engineStore(engine, versionedSnap(s => snapSubs(s.subs))),
    branches: engineStore(engine, versionedSnap(s => snapBranches(s.branches))),
  };
}

export type EngineStores = ReturnType<typeof createEngineStores>;

const STORES_KEY = Symbol('engine-stores');

export function setEngineStores(stores: EngineStores) {
  setContext(STORES_KEY, stores);
}

export function getEngineStores(): EngineStores {
  const stores = getContext<EngineStores>(STORES_KEY);
  if (!stores) throw new Error('getEngineStores() must be used within an engine context provider');
  return stores;
}

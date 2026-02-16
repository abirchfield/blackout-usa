import { getContext, setContext } from 'svelte';
import { readable, type Readable } from 'svelte/store';
import type { GameEngine } from '$lib/engine';
import type { StatsSnapshot, Substation, Branch } from '$lib/types';
import type { ForecastData } from '$lib/weather/forecast';

const ENGINE_KEY = Symbol('engine');

export function setEngine(engine: GameEngine) {
  setContext(ENGINE_KEY, engine);
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
    subs: engineStore<Record<string, Substation>>(engine, e => e.state.subs),
    branches: engineStore<Record<string, Branch>>(engine, e => e.state.branches),
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

/** Returns stable engine action methods. */
export function createActions(engine: GameEngine) {
  return {
    togglePause: () => engine.togglePause(),
    toggleFastForward: () => engine.toggleFastForward(),
    dismissAlert: (id: number) => engine.dismissAlert(id),
    dismissAllAlerts: () => engine.dismissAllAlerts(),
    dismissHint: (id: number) => engine.dismissHint(id),
    dismissAllHints: () => engine.dismissAllHints(),
    clearAlerts: () => engine.clearAlerts(),
    navigateToDay: (day: number) => engine.navigateToDay(day),
    startDay: () => engine.startDay(),
    advanceToNextDay: () => engine.advanceToNextDay(),
    toggleUnit: (subId: string, unitIndex: number) => engine.toggleUnit(subId, unitIndex),
    toggleLoadUnit: (subId: string, unitIndex: number) => engine.toggleLoadUnit(subId, unitIndex),
    abortTransition: (subId: string, unitIndex: number) => engine.abortTransition(subId, unitIndex),
    toggleBranch: (branchId: string) => engine.toggleBranch(branchId),
    setSetpoint: (subId: string, unitIndex: number, value: number) => engine.setSetpoint(subId, unitIndex, value),
  };
}

export type EngineActions = ReturnType<typeof createActions>;

const ACTIONS_KEY = Symbol('engine-actions');

export function setEngineActions(actions: EngineActions) {
  setContext(ACTIONS_KEY, actions);
}

export function getEngineActions(): EngineActions {
  const actions = getContext<EngineActions>(ACTIONS_KEY);
  if (!actions) throw new Error('getEngineActions() must be used within an engine context provider');
  return actions;
}

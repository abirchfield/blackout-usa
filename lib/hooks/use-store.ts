"use client";

import { createContext, useContext, useCallback, useSyncExternalStore } from 'react';
import { GameEngine } from '../engine';
import type { StatsSnapshot, Substation, Branch, SimulationAction } from '../types';

// --- Context ---

export const EngineContext = createContext<GameEngine | null>(null);

function useEngine(): GameEngine {
  const engine = useContext(EngineContext);
  if (!engine) throw new Error('useEngine must be used within <EngineContext.Provider>');
  return engine;
}

// --- Core selector hook ---

/**
 * Subscribe to a derived value from the engine.
 * Component only re-renders when the selector's return value changes (Object.is).
 */
export function useStore<T>(selector: (engine: GameEngine) => T): T {
  const engine = useEngine();
  return useSyncExternalStore(
    engine.subscribe,
    () => selector(engine),
  );
}

// --- Pre-built selectors ---

/** Full dashboard stats (cached in engine — stable reference when unchanged). */
export function useStats(): StatsSnapshot {
  return useStore(e => e.getStats());
}

export function useIsBlackout(): boolean {
  return useStore(e => e.isBlackout);
}

export function useAlerts() {
  return useStore(e => e.alerts);
}

export function useHints() {
  return useStore(e => e.hints);
}

/** Forces re-render on every simulation tick. Use for components that read mutable engine state. */
export function useSimTick(): number {
  return useStore(e => e.state._vSim);
}

/** Get a single substation by ID (re-renders only when _vSim changes). */
export function useSub(id: string | undefined): Substation | undefined {
  return useStore(e => id ? e.state.subs[id] : undefined);
}

/** Get a single branch by ID. */
export function useBranch(id: string | undefined): Branch | undefined {
  return useStore(e => id ? e.state.branches[id] : undefined);
}

// --- Playback selectors ---

export function useIsPaused(): boolean {
  return useStore(e => e.isPaused);
}

export function useIsFastForward(): boolean {
  return useStore(e => e.isFastForward);
}

export function useUserPaused(): boolean {
  return useStore(e => e.userPaused);
}

// --- Day lifecycle selectors ---

export function useDayTransitionId(): number {
  return useStore(e => e.dayTransitionId);
}

// --- Action hooks ---

/** Returns a stable dispatch function. */
export function useDispatch(): (action: SimulationAction) => void {
  const engine = useEngine();
  return useCallback(
    (action: SimulationAction) => engine.dispatch(action),
    [engine],
  );
}

/** Returns stable engine action methods. */
export function useActions() {
  const engine = useEngine();

  const dismissAlert = useCallback((id: number) => engine.dismissAlert(id), [engine]);
  const dismissAllAlerts = useCallback(() => engine.dismissAllAlerts(), [engine]);
  const dismissHint = useCallback((id: number) => engine.dismissHint(id), [engine]);
  const dismissAllHints = useCallback(() => engine.dismissAllHints(), [engine]);
  const clearAlerts = useCallback(() => engine.clearAlerts(), [engine]);

  const togglePause = useCallback(() => engine.togglePause(), [engine]);
  const toggleFastForward = useCallback(() => engine.toggleFastForward(), [engine]);

  // Day lifecycle
  const navigateToDay = useCallback((day: number) => engine.navigateToDay(day), [engine]);
  const beginDay = useCallback(() => engine.beginDay(), [engine]);
  const advanceToNextDay = useCallback(() => engine.advanceToNextDay(), [engine]);

  return {
    togglePause,
    toggleFastForward,
    dismissAlert,
    dismissAllAlerts,
    dismissHint,
    dismissAllHints,
    clearAlerts,
    navigateToDay,
    beginDay,
    advanceToNextDay,
  };
}

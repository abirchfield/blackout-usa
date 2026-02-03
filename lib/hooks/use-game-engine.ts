import { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from '../engine';
import { GameStatistics, Alert, Hint, Substation, Branch, ResultDetails, SimulationAction } from '../types';
import { KeyBindings } from '../key-bindings';
import { createInitialGameStatistics } from '../logic/grid-data';

interface UseGameEngineProps {
  theme: string | undefined;
  keyBindings: KeyBindings;
  animationsEnabled: boolean;
  renderCanvasText: boolean;
  zoomSensitivity: number;
  isPaused: boolean;
  isFastForward: boolean;
  onInteract: (type: 'sub' | 'branch', data: Substation | Branch) => void;
  onDayComplete: (day: number, results: ResultDetails | null) => void;
}

export function useGameEngine({
  theme,
  keyBindings,
  animationsEnabled,
  renderCanvasText,
  zoomSensitivity,
  isPaused,
  isFastForward,
  onInteract,
  onDayComplete
}: UseGameEngineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  
  const [stats, setStats] = useState<GameStatistics & { blackout?: boolean }>(createInitialGameStatistics());
  const [alerts, setAlerts] = useState<Array<{id: number, time: string, message: string, critical: boolean}>>([]);
  const [hints, setHints] = useState<Array<{id: number, time: string, message: string}>>([]);

  // Refs for loop access to avoid closure staleness
  const isPausedRef = useRef(isPaused);
  const isFastForwardRef = useRef(isFastForward);
  const onInteractRef = useRef(onInteract);
  const onDayCompleteRef = useRef(onDayComplete);

  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);
  useEffect(() => { isFastForwardRef.current = isFastForward; }, [isFastForward]);
  useEffect(() => { onInteractRef.current = onInteract; }, [onInteract]);
  useEffect(() => { onDayCompleteRef.current = onDayComplete; }, [onDayComplete]);

  // Initialize Engine
  useEffect(() => {
    if (canvasRef.current && !engineRef.current) {
      engineRef.current = new GameEngine(canvasRef.current);
      
      // Initial Setup
      engineRef.current.startDay(1);
      engineRef.current.update(1, false);
      setStats(engineRef.current.getDashboardStats());

      // Event Wiring
      engineRef.current.onInteract = (type, data) => onInteractRef.current(type, data);
      
      engineRef.current.onAlert = (alert: Alert, reset?: boolean) => {
        const timeStr = engineRef.current?.getDashboardStats().timeStr || "1:00 PM";
        setAlerts(prev => {
          const nextId = (reset || prev.length === 0) ? 0 : (prev[0].id + 1);
          const newAlert = { id: nextId, time: timeStr, ...alert };
          return reset ? [newAlert] : [newAlert, ...prev];
        });
      };

      engineRef.current.onHint = (hint: Hint, reset?: boolean) => {
        const timeStr = engineRef.current?.getDashboardStats().timeStr || "1:00 PM";
        setHints(prev => {
          const nextId = (reset || prev.length === 0) ? 0 : (prev[0].id + 1);
          const newHint = { id: nextId, time: timeStr, ...hint };
          return reset ? [newHint] : [newHint, ...prev];
        });
      };

      // Game Loop
      let animationFrameId: number;
      let lastGameStepTime = 0;

      const loop = (timestamp: number) => {
        if (engineRef.current) {
          if (!isPausedRef.current) {
            const gameSpeed = isFastForwardRef.current ? 50 : 500;
            if (timestamp - lastGameStepTime > gameSpeed) {
              const isDayOver = engineRef.current.update(1);
              lastGameStepTime = timestamp;
              
              const newStats = engineRef.current.getDashboardStats();
              setStats(newStats);

              if (isDayOver) {
                const results = engineRef.current.getResultsForDay(newStats.day, newStats.totalCost);
                onDayCompleteRef.current(newStats.day, results);
              }
            }
          }
          engineRef.current.draw(isPausedRef.current, isFastForwardRef.current);
        }
        animationFrameId = requestAnimationFrame(loop);
      };
      animationFrameId = requestAnimationFrame(loop);

      return () => {
        cancelAnimationFrame(animationFrameId);
        engineRef.current?.destroy();
        engineRef.current = null;
      };
    }
  }, []); // Run once on mount

  // Sync Props to Engine
  useEffect(() => {
    if (engineRef.current && theme) engineRef.current.setTheme(theme as 'light' | 'dark');
  }, [theme]);

  useEffect(() => {
    engineRef.current?.setAnimationsEnabled(animationsEnabled);
  }, [animationsEnabled]);

  useEffect(() => {
    engineRef.current?.setRenderCanvasText(renderCanvasText);
  }, [renderCanvasText]);

  useEffect(() => {
    engineRef.current?.setKeyBindings(keyBindings);
  }, [keyBindings]);

  useEffect(() => {
    engineRef.current?.setZoomSensitivity(zoomSensitivity);
  }, [zoomSensitivity]);

  // Helper methods
  const dispatch = useCallback((action: SimulationAction) => {
    engineRef.current?.dispatch(action);
  }, []);

  const startDay = useCallback((day: number) => {
    engineRef.current?.startDay(day);
    // Force an update to refresh stats immediately
    if (engineRef.current) setStats(engineRef.current.getDashboardStats());
  }, []);

  const getBriefing = useCallback((day: number) => {
    return engineRef.current?.getBriefingForDay(day) || null;
  }, []);

  return { canvasRef, engineRef, stats, alerts, hints, setAlerts, setHints, dispatch, startDay, getBriefing };
}
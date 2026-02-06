import { useEffect, useRef, useState } from 'react';
import { GameEngine } from '../engine';
import { activeCase } from '@/data/cases';

/**
 * Creates and manages the GameEngine lifecycle.
 * The engine owns its own RAF loop (startLoop/stopLoop).
 *
 * Returns the engine instance (null during the first render before the effect runs).
 * State subscriptions (stats, alerts, hints, playback) are handled via
 * useSyncExternalStore in use-store.ts.
 */
export function useCreateEngine(
  svgContainerRef: React.RefObject<HTMLDivElement | null>,
) {
  const engineRef = useRef<GameEngine | null>(null);
  const [, setReady] = useState(false);

  useEffect(() => {
    const element = svgContainerRef.current;
    if (!element || engineRef.current) return;

    const engine = new GameEngine(element, activeCase, { interactive: true });
    engine.startDay(1);
    engine.step(false);
    engine.startLoop();

    engineRef.current = engine;
    setReady(true); // Trigger re-render so context consumers mount

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- svgContainerRef is a stable ref
  }, []);

  return engineRef.current;
}

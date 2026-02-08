import { useEffect, useRef, useState } from 'react';
import { GameEngine } from '../engine';
import { loadCase } from '@/data/_out/registry';

/**
 * Creates and manages the GameEngine lifecycle.
 * Loads the case asynchronously via dynamic import, then creates the engine.
 *
 * Returns the engine instance (null while loading or before the effect runs).
 * State subscriptions (stats, alerts, hints, playback) are handled via
 * useSyncExternalStore in use-store.ts.
 */
export function useCreateEngine(
  containerRef: React.RefObject<HTMLDivElement | null>,
  caseName: string,
) {
  const engineRef = useRef<GameEngine | null>(null);
  const [, setReady] = useState(false);

  useEffect(() => {
    const element = containerRef.current;
    if (!element || engineRef.current) return;

    let cancelled = false;

    loadCase(caseName).then(gridCase => {
      if (cancelled || !containerRef.current) return;

      const engine = new GameEngine(containerRef.current, gridCase, { interactive: true });
      engine.startLoop();

      engineRef.current = engine;
      setReady(true); // Trigger re-render so context consumers mount
    });

    return () => {
      cancelled = true;
      engineRef.current?.destroy();
      engineRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- containerRef is a stable ref
  }, [caseName]);

  return engineRef.current;
}

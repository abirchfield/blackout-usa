import { useEffect, useRef } from 'react';
import { GameEngine } from '../engine';
import { KeyBindings, GameAction } from '../key-bindings';
import { Substation, Branch } from '../types';

interface UseGameInputProps {
  engineRef: React.MutableRefObject<GameEngine | null>;
  keyBindings: KeyBindings;
  // We use a ref for the blocked state to prevent the useEffect from re-running
  // whenever a modal opens/closes. This keeps the event listener stable.
  isInputBlockedRef: React.MutableRefObject<boolean>;
  selectedSub: Substation | null;
  selectedBranch: Branch | null;
  isBlackout?: boolean;
}

export function useGameInput({
  engineRef,
  keyBindings,
  isInputBlockedRef,
  selectedSub,
  selectedBranch,
  isBlackout
}: UseGameInputProps) {
  
  // We need refs for selection to access them inside the event listener
  // without adding them to the dependency array (which would cause re-binding).
  const selectionRef = useRef({ sub: selectedSub, branch: selectedBranch });
  useEffect(() => {
    selectionRef.current = { sub: selectedSub, branch: selectedBranch };
  }, [selectedSub, selectedBranch]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // 1. Check if input is blocked (Modals open, typing in inputs, etc.)
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable;
      
      if (isTyping || isInputBlockedRef.current || isBlackout) {
        return;
      }

      // 2. Map Key to Action
      const key = e.key.toLowerCase();
      const action = (Object.keys(keyBindings) as GameAction[]).find(
        (act) => keyBindings[act] === key
      );

      if (action) {
        const handler = engineRef.current?.getHandler();
        if (!handler) return;

        e.preventDefault();

        // 3. Execute Action
        if (action === 'CENTER_VIEW_ON_SELECTION') {
          const { sub, branch } = selectionRef.current;
          let targetCoords: { lon: number, lat: number } | null = null;
          
          if (sub) {
            targetCoords = { lon: sub.Longitude, lat: sub.Latitude };
          } else if (branch?.sub1 && branch?.sub2) {
            targetCoords = {
              lon: (branch.sub1.Longitude + branch.sub2.Longitude) / 2,
              lat: (branch.sub1.Latitude + branch.sub2.Latitude) / 2
            };
          }
          
          if (targetCoords) {
            handler.centerAndZoomOn(targetCoords.lon, targetCoords.lat);
          }
        } else {
          // Delegate standard actions to the GameHandler
          handler.performAction(action);
        }
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [keyBindings, engineRef, isInputBlockedRef, isBlackout]); // Stable dependencies
}

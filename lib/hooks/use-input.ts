import { useEffect } from 'react';
import { GameEngine } from '../engine';
import { KeyBindings, GameAction } from '../key-bindings';

interface UseGameInputProps {
  engine: GameEngine;
  keyBindings: KeyBindings;
  // Ref for the blocked state to prevent re-attaching listener on modal open/close
  isInputBlockedRef: React.MutableRefObject<boolean>;
  isBlackout?: boolean;
}

export function useInput({
  engine,
  keyBindings,
  isInputBlockedRef,
  isBlackout
}: UseGameInputProps) {

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable;

      if (isTyping || isInputBlockedRef.current || isBlackout) {
        return;
      }

      const key = e.key.toLowerCase();
      const action = (Object.keys(keyBindings) as GameAction[]).find(
        (act) => keyBindings[act] === key
      );

      if (action) {
        e.preventDefault();
        engine.performAction(action);
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- engine and isInputBlockedRef are stable refs
  }, [keyBindings, isBlackout]);
}

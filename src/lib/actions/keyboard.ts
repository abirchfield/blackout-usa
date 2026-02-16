import type { GameEngine } from '$lib/engine';
import type { KeyBindings, GameAction } from '$lib/types';

interface KeyboardParams {
  engine: GameEngine;
  keyBindings: KeyBindings;
  isBlocked: () => boolean;
  isBlackout: boolean;
}

export function keyboard(_node: HTMLElement, params: KeyboardParams) {
  let { engine, keyBindings, isBlocked, isBlackout } = params;

  function handleKeyDown(e: KeyboardEvent) {
    const target = e.target as HTMLElement;
    const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' || target.isContentEditable;

    if (isTyping || isBlocked() || isBlackout) return;

    // Don't intercept browser shortcuts
    if (e.ctrlKey || e.metaKey) return;

    const key = e.key.toLowerCase();
    const action = (Object.keys(keyBindings) as GameAction[]).find(
      (act) => keyBindings[act] === key
    );

    if (action) {
      e.preventDefault();
      engine.performAction(action);
    }
  }

  document.addEventListener('keydown', handleKeyDown);

  return {
    update(newParams: KeyboardParams) {
      ({ engine, keyBindings, isBlocked, isBlackout } = newParams);
    },
    destroy() {
      document.removeEventListener('keydown', handleKeyDown);
    },
  };
}

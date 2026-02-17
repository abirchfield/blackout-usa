import type { GameEngine } from '$lib/engine';
import type { KeyBindings, GameAction } from '$lib/types';

interface KeyboardParams {
  engine: GameEngine;
  keyBindings: KeyBindings;
  isBlocked: () => boolean;
  isBlackout: boolean;
}

export function keyboard(_node: HTMLElement, params: KeyboardParams) {
  let current = params;

  function handleKeyDown(e: KeyboardEvent) {
    const target = e.target as HTMLElement;
    const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' || target.isContentEditable;

    if (isTyping || current.isBlocked() || current.isBlackout) return;
    if (e.ctrlKey || e.metaKey) return;

    const key = e.key.toLowerCase();
    const action = (Object.keys(current.keyBindings) as GameAction[]).find(
      (act) => current.keyBindings[act] === key
    );

    if (action) {
      e.preventDefault();
      current.engine.performAction(action);
    }
  }

  document.addEventListener('keydown', handleKeyDown);

  return {
    update(newParams: KeyboardParams) { current = newParams; },
    destroy() { document.removeEventListener('keydown', handleKeyDown); },
  };
}

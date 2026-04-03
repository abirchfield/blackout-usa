import type { GameEngine } from '$lib/engine';
import type { KeyBindings, GameAction } from '$lib/types';

export interface KeyboardParams {
  engine: GameEngine;
  keyBindings: KeyBindings;
  isBlocked: () => boolean;
  isBlackout: () => boolean;
}

/** Build a key→action lookup from the action→key bindings. */
function invertBindings(kb: KeyBindings): Record<string, GameAction> {
  const out: Record<string, GameAction> = {};
  for (const act of Object.keys(kb) as GameAction[]) out[kb[act]] = act;
  return out;
}

/**
 * Runes-based keyboard controller. Instantiate during component init —
 * the internal $effect auto-tracks reactive reads in the params getter
 * and re-binds the keydown handler when bindings change.
 */
export class KeyboardController {
  #cleanup: (() => void) | undefined;

  constructor(getParams: () => KeyboardParams) {
    $effect(() => {
      const params = getParams();
      const keyToAction = invertBindings(params.keyBindings);

      function handleKeyDown(e: KeyboardEvent) {
        const target = e.target as HTMLElement;
        const isTyping = target.matches('input, textarea, select, [contenteditable="true"]');

        if (isTyping || params.isBlocked() || params.isBlackout()) return;
        if (e.ctrlKey || e.metaKey) return;

        const action = keyToAction[e.key.toLowerCase()];

        if (action) {
          e.preventDefault();
          params.engine.performAction(action);
        }
      }

      document.addEventListener('keydown', handleKeyDown);
      this.#cleanup = () => document.removeEventListener('keydown', handleKeyDown);
      return () => this.#cleanup?.();
    });
  }

  destroy() { this.#cleanup?.(); }
}

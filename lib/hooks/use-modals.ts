import { useState, useCallback, useRef } from 'react';
import { Briefing, ResultDetails, GameStatistics } from '../types';

export type ModalId =
  | 'quit'
  | 'accessibility'
  | 'alerts'
  | 'hints'
  | 'help'
  | 'substation'
  | 'branch'
  | 'day-briefing'
  | 'day-results';

export interface ModalPayload {
  substationId?: string;
  branchId?: string;
  targetDay?: number;
  briefing?: Briefing | null;
  resultDetails?: ResultDetails | null;
  gameStatistics?: GameStatistics;
}

/**
 * Unified modal manager hook
 *
 * Centralizes ALL modal state to ensure:
 * 1. Game pauses whenever ANY modal is open
 * 2. Focus is properly saved/restored
 * 3. Single source of truth for modal visibility
 */
export function useModals() {
  const [activeModal, setActiveModal] = useState<ModalId | null>(null);
  const [payload, setPayload] = useState<ModalPayload>({});
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  /**
   * Open a modal, optionally with payload data
   * Saves current focus for restoration on close
   */
  const openModal = useCallback((id: ModalId, newPayload?: ModalPayload) => {
    lastFocusedRef.current = document.activeElement as HTMLElement;
    // Release focus before Radix Dialog applies aria-hidden to non-dialog content,
    // preventing "Blocked aria-hidden on a focused element" warnings.
    lastFocusedRef.current?.blur();
    setPayload(newPayload || {});
    setActiveModal(id);
  }, []);

  /**
   * Close the active modal
   * Clears payload and restores focus
   */
  const closeModal = useCallback(() => {
    setActiveModal(null);
    setPayload({});
    // Defer focus restoration to allow Radix Dialog exit animation to complete.
    // This prevents focus from being trapped in the closing dialog.
    requestAnimationFrame(() => {
      lastFocusedRef.current?.focus();
    });
  }, []);

  /**
   * Check if a specific modal is open
   */
  const isOpen = useCallback((id: ModalId) => activeModal === id, [activeModal]);

  /**
   * Handler for Radix Dialog's onOpenChange prop
   */
  const onOpenChange = useCallback((id: ModalId, open: boolean) => {
    if (open) {
      openModal(id);
    } else {
      closeModal();
    }
  }, [openModal, closeModal]);

  /**
   * Atomically swap the active modal and payload in a single update.
   * Avoids the close-then-open race condition that requires setTimeout hacks.
   */
  const replaceModal = useCallback((id: ModalId, newPayload?: ModalPayload) => {
    setPayload(newPayload || {});
    setActiveModal(id);
  }, []);

  /**
   * Update payload without changing active modal
   * Useful for updating day transition state (e.g., gameStatistics)
   */
  const updatePayload = useCallback((updates: Partial<ModalPayload>) => {
    setPayload(prev => ({ ...prev, ...updates }));
  }, []);

  return {
    // State
    activeModal,
    payload,

    // Actions
    openModal,
    closeModal,
    replaceModal,
    updatePayload,

    // Queries
    isOpen,
    onOpenChange,
    isAnyModalOpen: activeModal !== null,
    /** True when an open modal should pause the game (all except substation/branch). */
    isPausingModal: activeModal !== null && activeModal !== 'substation' && activeModal !== 'branch',

    // Focus ref (exposed for edge cases)
    lastFocusedRef,
  };
}

export type ModalManager = ReturnType<typeof useModals>;

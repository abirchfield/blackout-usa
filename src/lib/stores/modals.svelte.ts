import type { ResultDetails, StatsSnapshot } from '$lib/types';

export type ModalId =
  | 'quit'
  | 'accessibility'
  | 'alerts'
  | 'hints'
  | 'help'
  | 'grid'
  | 'day-briefing'
  | 'day-results';

export interface ModalPayload {
  substationId?: string;
  branchId?: string;
  targetDay?: number;
  info?: string[] | null;
  resultDetails?: ResultDetails | null;
  gameStatistics?: StatsSnapshot;
}

export type ModalState = ReturnType<typeof createModalState>;

/**
 * Factory for modal state. Each consumer creates its own instance,
 * scoped to the component's lifecycle. No singleton — no stale state
 * between SvelteKit page navigations.
 */
export function createModalState() {
  let activeModal = $state<ModalId | null>(null);
  let payload = $state<ModalPayload>({});
  let lastFocused: HTMLElement | null = null;

  const isAnyModalOpen = $derived(activeModal !== null);
  const isPausingModal = $derived(activeModal !== null && activeModal !== 'grid');

  /** Open a modal by ID, optionally with payload data. */
  function openModal(id: ModalId, newPayload?: ModalPayload) {
    lastFocused = document.activeElement as HTMLElement;
    lastFocused?.blur();
    payload = newPayload || {};
    activeModal = id;
  }

  /** Close the active modal and restore focus to the previously focused element. */
  function closeModal() {
    activeModal = null;
    payload = {};
    requestAnimationFrame(() => {
      if (lastFocused && document.contains(lastFocused)) {
        lastFocused.focus();
      }
    });
  }

  /** Toggle callback for bits-ui Dialog open state. */
  function onOpenChange(id: ModalId, open: boolean) {
    if (open) {
      openModal(id);
    } else {
      closeModal();
    }
  }

  return {
    get activeModal() { return activeModal; },
    get payload() { return payload; },
    get isAnyModalOpen() { return isAnyModalOpen; },
    get isPausingModal() { return isPausingModal; },
    openModal,
    closeModal,
    onOpenChange,
  };
}

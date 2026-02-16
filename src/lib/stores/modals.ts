import { writable, derived } from 'svelte/store';
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

function createModalStore() {
  const activeModal = writable<ModalId | null>(null);
  const payload = writable<ModalPayload>({});
  let lastFocused: HTMLElement | null = null;

  function openModal(id: ModalId, newPayload?: ModalPayload) {
    lastFocused = document.activeElement as HTMLElement;
    lastFocused?.blur();
    payload.set(newPayload || {});
    activeModal.set(id);
  }

  function closeModal() {
    activeModal.set(null);
    payload.set({});
    requestAnimationFrame(() => {
      if (lastFocused && document.contains(lastFocused)) {
        lastFocused.focus();
      }
    });
  }

  function onOpenChange(id: ModalId, open: boolean) {
    if (open) {
      openModal(id);
    } else {
      closeModal();
    }
  }

  function replaceModal(id: ModalId, newPayload?: ModalPayload) {
    payload.set(newPayload || {});
    activeModal.set(id);
  }

  function updatePayload(updates: Partial<ModalPayload>) {
    payload.update(p => ({ ...p, ...updates }));
  }

  const isAnyModalOpen = derived(activeModal, $m => $m !== null);
  const isPausingModal = derived(activeModal, $m => $m !== null && $m !== 'grid');

  return {
    activeModal,
    payload,
    openModal,
    closeModal,
    replaceModal,
    updatePayload,
    onOpenChange,
    isAnyModalOpen,
    isPausingModal,
  };
}

export const modals = createModalStore();

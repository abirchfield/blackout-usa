import { useState, useCallback, useRef } from 'react';

export type ModalId = 'quit' | 'accessibility' | 'alerts' | 'hints' | 'help';

export function useModalManager() {
  const [activeModal, setActiveModal] = useState<ModalId | null>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  const openModal = useCallback((id: ModalId) => {
    lastFocusedRef.current = document.activeElement as HTMLElement;
    setActiveModal(id);
  }, []);

  const closeModal = useCallback(() => {
    setActiveModal(null);
    lastFocusedRef.current?.focus();
  }, []);

  const isOpen = useCallback((id: ModalId) => activeModal === id, [activeModal]);

  const onOpenChange = useCallback((id: ModalId, open: boolean) => {
    if (open) {
      openModal(id);
    } else {
      closeModal();
    }
  }, [openModal, closeModal]);

  return {
    activeModal,
    openModal,
    closeModal,
    isOpen,
    onOpenChange,
    isAnyModalOpen: activeModal !== null,
  };
}

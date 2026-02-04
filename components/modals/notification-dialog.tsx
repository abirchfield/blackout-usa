"use client";

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import { NotificationList } from "@/components/modals/notification-list";

interface NotificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  items: Array<{id: number; time: string; message: string; critical?: boolean}>;
  onRemove: (id: number) => void;
  onDismissAll: () => void;
  emptyMessage: string;
  ariaLabel: string;
}

export function NotificationDialog({ open, onOpenChange, title, description, items, onRemove, onDismissAll, emptyMessage, ariaLabel }: NotificationDialogProps) {
  if (!open) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto -mx-6 px-6">
          <NotificationList items={items} onRemove={onRemove} onDismissAll={onDismissAll} emptyMessage={emptyMessage} ariaLabel={ariaLabel} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

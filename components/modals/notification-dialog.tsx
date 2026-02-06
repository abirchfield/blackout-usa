"use client";

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

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
      <DialogContent id="notifications-modal" className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto -mx-6 px-6">
          {items.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">{emptyMessage}</div>
          ) : (
            <div>
              <div className="flex justify-end p-2 border-b">
                <Button variant="ghost" size="sm" onClick={onDismissAll}>Dismiss All</Button>
              </div>
              <ul className="flex flex-col" aria-label={ariaLabel}>
                {items.map((item) => (
                  <li key={item.id} className="flex items-start gap-3 border-b p-3">
                    <Badge variant="secondary" className="mt-0.5 whitespace-nowrap">{item.time}</Badge>
                    <p className={`flex-1 text-sm leading-snug ${item.critical ? "text-destructive font-semibold" : ""}`}>
                      {item.critical && <span className="sr-only">Critical: </span>}
                      {item.message}
                    </p>
                    <Button variant="ghost" size="icon" onClick={() => onRemove(item.id)} className="h-6 w-6 shrink-0 cursor-pointer" aria-label={`Dismiss: ${item.message}`}>
                      <X className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

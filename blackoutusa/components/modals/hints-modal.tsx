"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface Hint {
  id: number;
  time: string;
  message: string;
}

interface HintsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hints: Hint[];
  onRemoveHint: (id: number) => void;
}

interface HintsListProps {
  hints: Hint[];
  onRemoveHint: (id: number) => void;
}

export function HintsList({ hints, onRemoveHint }: HintsListProps) {
  return (
    <div className="flex-1 overflow-y-auto border-t border-border -mx-6 -mb-6">
      <div className="grid grid-cols-[90px_1fr_auto] gap-4 p-2 font-bold border-b border-border sticky top-0 bg-popover px-6">
        <div>Time</div>
        <div>Message</div>
        <div>Action</div>
      </div>
      <div className="px-6">
        {hints.length === 0 && (
          <div className="p-4 text-center text-muted-foreground">No hints to show</div>
        )}
        {hints.map((hint) => (
          <div key={hint.id} className="grid grid-cols-[90px_1fr_auto] gap-4 p-2 border-b border-border items-center">
            <div>{hint.time}</div>
            <div>{hint.message}</div>
            <Button variant="secondary" size="sm" onClick={() => onRemoveHint(hint.id)} className="cursor-pointer">OK</Button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HintsModal({ open, onOpenChange, hints, onRemoveHint }: HintsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] font-share-tech max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold">Hints</DialogTitle>
          <DialogDescription className="hidden">List of game hints</DialogDescription>
        </DialogHeader>
        <HintsList hints={hints} onRemoveHint={onRemoveHint} />
      </DialogContent>
    </Dialog>
  );
}
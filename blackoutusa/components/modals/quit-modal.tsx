"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface QuitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onQuitToStart: () => void;
  onReplayDay: () => void;
  onNextDay: () => void;
}

export function QuitModal({ open, onOpenChange, onQuitToStart, onReplayDay, onNextDay }: QuitModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] font-share-tech">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold">Quit the game?</DialogTitle>
          <DialogDescription className="hidden">Quit options</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <Button variant="secondary" className="text-xl py-6 cursor-pointer" onClick={onQuitToStart}>
            Quit and go back to beginning
          </Button>
          <Button variant="secondary" className="text-xl py-6 cursor-pointer" onClick={onReplayDay}>
            Restart this day
          </Button>
          <Button variant="secondary" className="text-xl py-6 cursor-pointer" onClick={onNextDay}>
            Skip forward to the next day
          </Button>
          <Button variant="outline" className="text-xl py-6 cursor-pointer" onClick={() => onOpenChange(false)}>
            Cancel, continue the game
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
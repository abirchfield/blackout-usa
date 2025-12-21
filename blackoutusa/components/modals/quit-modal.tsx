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
  day: number;
  onQuitToStart: () => void;
  onReplayDay: (currentDay: number) => void;
  onNextDay: (currentDay: number) => void;
}

export function QuitModal({ open, onOpenChange, day, onQuitToStart, onReplayDay, onNextDay }: QuitModalProps) {
  return (
    <Dialog open={open} onOpenChange={() => {
      // Do nothing. This prevents dismissal via overlay click, Esc, or the 'X' button.
      // The modal must be closed via an explicit action inside it.
    }}>
      <DialogContent className="sm:max-w-[600px] font-share-tech [&>button]:hidden">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold">Quit the game?</DialogTitle>
          <DialogDescription className="hidden">Quit options</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <Button variant="secondary" className="text-xl py-6 cursor-pointer" onClick={onQuitToStart}>
            Quit and go back to beginning
          </Button>
          <Button variant="secondary" className="text-xl py-6 cursor-pointer" onClick={() => onReplayDay(day)}>
            Restart this day
          </Button>
          <Button variant="secondary" className="text-xl py-6 cursor-pointer" onClick={() => onNextDay(day)}>
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
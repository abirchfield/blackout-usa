"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { RotateCw, ArrowRight, LogOut } from "lucide-react"

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
        <div className="flex flex-col gap-3 py-4 text-base">
          <Button variant="destructive" className="w-full justify-center gap-2 py-6 text-lg" onClick={onQuitToStart}>
            <LogOut className="h-5 w-5" />
            <span>Quit to Start</span>
          </Button>
          <Button variant="secondary" className="w-full justify-center gap-2 py-6 text-lg" onClick={() => onReplayDay(day)}>
            <RotateCw className="h-5 w-5" />
            <span>Restart This Day</span>
          </Button>
          <Button className="w-full justify-center gap-2 py-6 text-lg" onClick={() => onNextDay(day)}>
            <span>Skip to Next Day</span>
            <ArrowRight className="h-5 w-5" />
          </Button>
          <Button variant="outline" className="w-full justify-center gap-2 py-6 text-lg mt-4" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
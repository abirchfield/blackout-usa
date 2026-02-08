"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { hcVariant } from "@/lib/utils"
import { RotateCw, ArrowRight, LogOut, Play } from "lucide-react"

interface QuitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  day: number;
  onQuitToStart: () => void;
  onReplayDay: (currentDay: number) => void;
  onNextDay: (currentDay: number) => void;
  isHighContrast?: boolean;
}

export function QuitModal({ open, onOpenChange, day, onQuitToStart, onReplayDay, onNextDay, isHighContrast }: QuitModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent id="quit-modal" className="sm:max-w-lg font-sans" overlayClassName="bg-black/70">
        <DialogHeader>
          <DialogTitle className="text-2xl">Quit the game?</DialogTitle>
          <DialogDescription>Choose how to continue your session.</DialogDescription>
        </DialogHeader>
        <div role="group" aria-label="Quit actions" className="grid grid-cols-1 gap-2 pt-2">
          <Button
            className="w-full justify-center gap-2"
            onClick={() => onOpenChange(false)}
          >
            <Play className="h-4 w-4" aria-hidden="true" />
            <span>Back to work!</span>
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={hcVariant(isHighContrast ?? false)}
              className="w-full justify-center gap-2"
              onClick={() => onReplayDay(day)}
            >
              <RotateCw className="h-4 w-4" aria-hidden="true" />
              <span>Replay Day</span>
            </Button>
            <Button
              variant={hcVariant(isHighContrast ?? false)}
              className="w-full justify-center gap-2"
              onClick={() => onNextDay(day)}
            >
              <span>Next Day</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
          <Button
            variant="destructive"
            size="sm"
            className="w-full justify-center gap-2"
            onClick={onQuitToStart}
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span>Home Page</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
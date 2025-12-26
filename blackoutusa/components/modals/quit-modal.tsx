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
  isHighContrast?: boolean;
}

export function QuitModal({ open, onOpenChange, day, onQuitToStart, onReplayDay, onNextDay, isHighContrast }: QuitModalProps) {
  return ( <Dialog open={open} onOpenChange={onOpenChange}> <DialogContent className="sm:max-w-[600px] font-share-tech">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold">Quit the game?</DialogTitle>
          <DialogDescription className="sr-only">Quit options</DialogDescription>
        </DialogHeader>
        <div role="group" aria-label="Quit actions" className="flex flex-col gap-3 py-4 text-base">
          <Button variant="destructive" className="w-full justify-center gap-2 py-4 text-base" onClick={onQuitToStart}>
            <LogOut className="h-5 w-5" aria-hidden="true" />
            <span>Quit to Start</span>
          </Button>
          <Button variant={isHighContrast ? "outline" : "secondary"} className="w-full justify-center gap-2 py-4 text-base" onClick={() => onReplayDay(day)}>
            <RotateCw className="h-5 w-5" aria-hidden="true" />
            <span>Restart This Day</span>
          </Button>
          <Button className="w-full justify-center gap-2 py-4 text-base" onClick={() => onNextDay(day)}>
            <span>Skip to Next Day</span>
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
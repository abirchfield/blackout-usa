"use client";

import { RotateCw, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { hcVariant } from "@/lib/utils";
import { DayResults } from "@/components/game/day-results";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ResultDetails, StatsSnapshot } from "@/lib/types";

interface DayTransitionModalProps {
  open: boolean;
  mode: 'briefing' | 'results';
  targetDay: number;
  info: string[] | null | undefined;
  resultDetails: ResultDetails | null | undefined;
  gameStatistics: StatsSnapshot;
  isHighContrast: boolean;
  onStartDay: () => void;
  onClose: () => void;
  onReplayDay: (day: number) => void;
  onNextDay: (day: number) => void;
}

export function DayTransitionModal({
  open,
  mode,
  targetDay,
  info,
  resultDetails,
  gameStatistics,
  isHighContrast,
  onStartDay,
  onClose,
  onReplayDay,
  onNextDay,
}: DayTransitionModalProps) {
  if (!open) return null;

  // Check if day is in progress (user can close briefing to continue)
  const isDayInProgress = gameStatistics.day === targetDay && gameStatistics.timeStep > 0;

  // Determine if modal should be dismissible
  // Results modal is never dismissible (must choose replay or next)
  // Briefing is only dismissible if day is already in progress
  const canDismiss = mode === 'briefing' && isDayInProgress;

  return (
    <Dialog open={open}>
      <DialogContent
        id="day-transition-modal"
        className="sm:max-w-lg font-sans"
        overlayClassName="bg-black/70"
        showCloseButton={canDismiss}
        onPointerDownOutside={(e) => { if (!canDismiss) e.preventDefault(); else onClose(); }}
        onEscapeKeyDown={(e) => { if (!canDismiss) e.preventDefault(); else onClose(); }}
      >
        {mode === 'results' && resultDetails ? (
          <>
            <DialogHeader className="sr-only">
              <DialogTitle>Day {gameStatistics.day} Results</DialogTitle>
              <DialogDescription>Review your performance for this day.</DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <DayResults stats={gameStatistics} day={gameStatistics.day} resultDetails={resultDetails} />
              <div className="grid grid-cols-2 gap-3 pt-2">
                <Button
                  onClick={() => onReplayDay(gameStatistics.day)}
                  variant={hcVariant(isHighContrast)}
                  className="flex items-center justify-center gap-2"
                >
                  <RotateCw className="h-4 w-4" aria-hidden="true" />
                  <span>Replay Today</span>
                </Button>
                <Button
                  onClick={() => onNextDay(gameStatistics.day)}
                  className="flex items-center justify-center gap-2"
                >
                  <span>Next Day</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </>
        ) : info ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl">Day {targetDay} Briefing</DialogTitle>
              <DialogDescription className="sr-only">Read the briefing and start the day when ready.</DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <div className="bg-muted/20 p-4 rounded-lg border border-border text-sm">
                {info.length > 1 ? (
                  <ul className="list-disc pl-4 space-y-2">
                    {info.map((line, index) => (
                      <li key={index}>{line}</li>
                    ))}
                  </ul>
                ) : (
                  <p>{info[0]}</p>
                )}
              </div>
              {isDayInProgress ? (
                <Button onClick={onClose} variant="secondary" className="w-full text-lg py-6">
                  Continue
                </Button>
              ) : (
                <Button onClick={onStartDay} className="w-full text-lg py-6">
                  Start Day {targetDay}
                </Button>
              )}
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

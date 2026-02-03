"use client";

import { RotateCw, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DayResults } from "@/components/day-results";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Briefing, ResultDetails, GameStatistics } from "@/lib/types";

interface DayTransitionModalProps {
  isDayTransition: boolean;
  isDayFinished: boolean;
  targetDay: number;
  currentBriefing: Briefing | null;
  dayResultDetails: ResultDetails | null;
  gameStatistics: GameStatistics;
  isHighContrast: boolean;
  onStartDay: () => void;
  onReplayDay: (day: number) => void;
  onNextDay: (day: number) => void;
}

export function DayTransitionModal({
  isDayTransition,
  isDayFinished,
  targetDay,
  currentBriefing,
  dayResultDetails,
  gameStatistics,
  isHighContrast,
  onStartDay,
  onReplayDay,
  onNextDay,
}: DayTransitionModalProps) {
  const isOpen = isDayTransition || isDayFinished;
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen}>
      <DialogContent
        className="sm:max-w-lg font-share-tech"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {isDayFinished && dayResultDetails ? (
          <>
            <DialogHeader className="sr-only">
              <DialogTitle>Day {gameStatistics.day} Results</DialogTitle>
              <DialogDescription>Review your performance for this day.</DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <DayResults stats={gameStatistics} day={gameStatistics.day} resultDetails={dayResultDetails} />
              <div className="grid grid-cols-2 gap-3 pt-2">
                <Button
                  onClick={() => onReplayDay(gameStatistics.day)}
                  variant={isHighContrast ? "outline" : "secondary"}
                  className="flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RotateCw className="h-4 w-4" />
                  <span>Replay Today</span>
                </Button>
                <Button
                  onClick={() => onNextDay(gameStatistics.day)}
                  className="flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Next Day</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : currentBriefing ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl">Day {targetDay} Briefing</DialogTitle>
              <DialogDescription className="sr-only">Read the briefing and start the day when ready.</DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <div className="bg-muted/20 p-4 rounded-lg border border-border text-sm">
                {currentBriefing.isList ? (
                  <ul className="list-disc pl-4 space-y-2">
                    {currentBriefing.points.map((point, index) => (
                      <li key={index}>{point}</li>
                    ))}
                  </ul>
                ) : (
                  <p>{currentBriefing.points[0]}</p>
                )}
              </div>
              <Button onClick={onStartDay} className="w-full text-lg py-6">
                Start Day {targetDay}
              </Button>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

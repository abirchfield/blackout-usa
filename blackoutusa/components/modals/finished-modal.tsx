"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { DashboardStats } from "@/lib/game/types"

interface FinishedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stats?: DashboardStats;
  day: number;
  onNextDay: () => void;
  onReplay: () => void;
  onQuit: () => void;
}

function getResultMessage(day: number, totalCost: number): string {
  const costM = (totalCost / 1000000).toFixed(2);
  let record = 0;
  let good = 0;
  let okay = 0;

  if (day === 1) { record = 1.65; good = 2.0; okay = 10.0; }
  else if (day === 2) { record = 1.41; good = 2.0; okay = 10.0; }
  else if (day === 3) { record = 3.35; good = 5.0; okay = 15.0; }
  else if (day === 4) { record = 3.22; good = 8.0; okay = 20.0; }
  else if (day === 5) { record = 12.90; good = 18.0; okay = 30.0; }

  if (totalCost / 1000000 < record) {
    return `Total cost for your shift was $${costM}M.<br/>Amazing!! This is better than the prior record, $${record}M.<br/>Super job managing the grid today and keeping costs low &#x1F44D;&#xfe0e;`;
  } else if (totalCost / 1000000 < good) {
    return `Total cost for your shift was $${costM}M.<br/>Great job! The record for this scenario is $${record}M.<br/>Super job managing the grid today and keeping costs low &#x1F44D;&#xfe0e;`;
  } else if (totalCost / 1000000 < okay) {
    return `Total cost for your shift was $${costM}M.<br/>Not too bad. We would hope to keep the cost under $${good}M for this scenario.<br/>Feel free to give it another try &#x1F44D;&#xfe0e;`;
  } else {
    return `Total cost for your shift was $${costM}M.<br/>That's too high! We would hope to keep the cost under $${good}M for this scenario.<br/>Feel free to give it another try &#x1F44D;&#xfe0e;`;
  }
}

export function FinishedModal({ open, onOpenChange, stats, day, onNextDay, onReplay, onQuit }: FinishedModalProps) {
  if (!stats) return null;

  const resultMessage = getResultMessage(day, stats.totalCost);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] font-share-tech">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold">Day {day} Results</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div
            className="text-lg"
            dangerouslySetInnerHTML={{ __html: resultMessage }}
          />
          <div className="border-t pt-4 mt-4">
            <h4 className="text-xl font-bold mb-2">Additional Stats from Your Shift</h4>
            <div className="text-sm space-y-1">
              <p>Total generator operating cost: ${(stats.totalOpCost / 1000).toFixed(0)}k</p>
              <p>Total fuel cost: ${(stats.totalFuelCost / 1000).toFixed(0)}k</p>
              <p>Total unserved load cost: ${(stats.totalUnservedCost / 1000).toFixed(0)}k</p>
              <p>Average cost of power: ${stats.avgCost.toFixed(2)}/MWh</p>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Button onClick={onNextDay} className="w-full">Start the next day</Button>
          <Button onClick={onReplay} variant="secondary" className="w-full">Replay this day</Button>
          <Button onClick={onQuit} variant="secondary" className="w-full">Back to beginning</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
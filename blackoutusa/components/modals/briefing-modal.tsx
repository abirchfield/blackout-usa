"use client";

import { Briefing } from "@/lib/game/types";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

interface BriefingContentProps {
  onClose: () => void;
  day: number;
  briefing: Briefing;
}

export function BriefingContent({ onClose, day, briefing }: BriefingContentProps) {
  if (!briefing) return null;

  return (
    <div className="p-4 max-w-sm font-share-tech">
      <div className="space-y-1.5">
        <h3 className="text-lg font-bold">Day {day} Briefing</h3>
        <p className="text-sm text-muted-foreground">
          Your objectives for the upcoming shift.
        </p>
      </div>
      <div className="bg-muted/20 p-4 rounded-lg border border-border text-sm my-4">
        {briefing.isList ? (
          <ul className="list-disc pl-5 space-y-2">
            {briefing.points.map((point, index) => <li key={index}>{point}</li>)}
          </ul>
        ) : (<p>{briefing.points[0]}</p>)}
      </div>
      <div className="flex justify-end">
        <Button onClick={onClose} size="icon" className="bg-green-600 hover:bg-green-700 cursor-pointer">
          <Check className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
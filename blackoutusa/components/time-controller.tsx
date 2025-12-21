"use client"

import { Play, Pause, FastForward } from "lucide-react"
import { Button } from "@/components/ui/button"

interface TimeControllerProps {
  progress: number;
  isPaused: boolean;
  isFastForward: boolean;
  onTogglePause: () => void;
  onToggleFastForward: () => void;
}

export function TimeController({ 
  progress, 
  isPaused, 
  isFastForward, 
  onTogglePause, 
  onToggleFastForward 
}: TimeControllerProps) {
  return (
    <div className="flex flex-col w-full gap-1">
      <div className="flex items-center gap-3 w-full">
        <Button
          variant="ghost"
          size="icon"
          onClick={onTogglePause}
          title={isPaused ? "Resume" : "Pause"}
          className="h-8 w-8 cursor-pointer shrink-0"
        >
          {isPaused ? <Play className="h-3 w-3 fill-current" /> : <Pause className="h-3 w-3 fill-current" />}
        </Button>
        <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden" title={`Day Progress: ${progress.toFixed(0)}%`}>
          <div 
            className="h-full bg-primary transition-all duration-300 ease-linear" 
            style={{ width: `${progress}%` }}
          />
        </div>
        <Button
          variant={isFastForward ? "secondary" : "ghost"}
          size="icon"
          onClick={onToggleFastForward}
          title={isFastForward ? "Normal Speed" : "Fast Forward"}
          className="h-8 w-8 cursor-pointer shrink-0"
        >
          <FastForward className={`h-3 w-3 ${isFastForward ? "fill-current" : ""}`} />
        </Button>
      </div>
      <div className="flex justify-between text-[10px] uppercase text-muted-foreground font-semibold leading-none px-11">
        <span>1 PM</span>
        <span>11 PM</span>
      </div>
    </div>
  )
}

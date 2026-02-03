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
      <div className="flex items-center gap-3 w-full">
        <Button
          variant="ghost"
          size="icon"
          onClick={onTogglePause}          aria-label={isPaused ? "Resume" : "Pause"}
          className="h-6 w-6 cursor-pointer shrink-0"
        >
          {isPaused ? <Play className="h-4 w-4 fill-current" /> : <Pause className="h-4 w-4 fill-current" />}
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
          onClick={onToggleFastForward}          aria-label={isFastForward ? "Normal Speed" : "Fast Forward"}
          className="h-6 w-6 cursor-pointer shrink-0"
          disabled={isPaused}
        >
          <FastForward className={`h-4 w-4 ${isFastForward ? "fill-current" : ""}`} />
        </Button>
      </div>
  )
}

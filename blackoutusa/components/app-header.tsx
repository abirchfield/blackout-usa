"use client"

import { useTheme } from "next-themes"
import { HelpCircle, X, Sun, Moon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DashboardStats } from "@/lib/game/types"
import { TimeController } from "./header/time-controller"

interface AppHeaderProps {
  onHelpClick: () => void;
  onQuitClick: () => void;
  stats?: DashboardStats;
  progress: number;
  isPaused: boolean;
  isFastForward: boolean;
  onTogglePause: () => void;
  onToggleFastForward: () => void;
}

export function AppHeader({ onHelpClick, onQuitClick, stats, progress, isPaused, isFastForward, onTogglePause, onToggleFastForward }: AppHeaderProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const s = stats || {
    day: 1,
    timeStr: "1:00 PM",
  }

  return (
    <header className="bg-background sticky top-0 grid grid-cols-3 items-center border-b p-4 h-16 z-50">
      <div className="justify-self-start">
        <h2 className="text-2xl font-bold font-share-tech text-foreground">
          Blackout USA
        </h2>
      </div>

      <div className="justify-self-center flex items-center gap-6 font-share-tech">
        <div className="flex items-center gap-2">
          <span className="text-xl font-semibold text-muted-foreground uppercase">Day</span>
          <span className="w-[2ch] text-left text-xl font-semibold text-muted-foreground tabular-nums">
            {s.day || 1}
          </span>
        </div>
        <div className="h-6 w-px bg-border" />
        <span className="w-[10ch] text-center text-xl font-bold text-foreground tabular-nums tracking-wider">{s.timeStr}</span>
        <div className="h-6 w-px bg-border" />
        <div className="w-48">
          <TimeController
            progress={progress}
            isPaused={isPaused}
            isFastForward={isFastForward}
            onTogglePause={onTogglePause}
            onToggleFastForward={onToggleFastForward}
            showLabels={false}
          />
        </div>
      </div>

      <div className="justify-self-end flex items-center gap-4">
        <div className="flex items-center gap-1 border-l pl-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            title="Toggle theme"
            className="cursor-pointer"
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onHelpClick}
            title="Help"
            className="cursor-pointer"
          >
            <HelpCircle className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onQuitClick} title="Quit" className="cursor-pointer">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  )
}
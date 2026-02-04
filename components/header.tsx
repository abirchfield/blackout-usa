"use client"

import { useState } from "react"
import { HelpCircle, LogOut, PersonStanding, Play, Pause, FastForward, Bell, Lightbulb, FileText, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { hcVariant } from "@/lib/utils"

function NotificationDot({ ping, color }: { ping?: boolean; color: string }) {
  return (
    <span className="absolute top-1 right-1 flex h-2 w-2" aria-hidden="true">
      {ping && <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${color} opacity-75`} />}
      <span className={`relative inline-flex rounded-full h-2 w-2 ${color}`} />
    </span>
  );
}

interface AppHeaderProps {
  onAccessibilityClick: () => void;
  onHelpClick: () => void;
  onQuitClick: () => void;
  isPaused: boolean;
  isFastForward: boolean;
  onTogglePause: () => void;
  onToggleFastForward: () => void;
  onAlertsClick: () => void;
  onHintsClick: () => void;
  onBriefingClick: () => void;
  alertsCount: number;
  hintsCount: number;
  controlsDisabled?: boolean;
  isBlackout?: boolean;
  isHighContrast?: boolean;
}

function TimeControls({ isPaused, isFastForward, onTogglePause, onToggleFastForward, controlsDisabled, isHighContrast }: Pick<AppHeaderProps, 'isPaused' | 'isFastForward' | 'onTogglePause' | 'onToggleFastForward' | 'controlsDisabled' | 'isHighContrast'>) {
  return (
    <>
      <Button variant="ghost" size="icon" onClick={onTogglePause} aria-label={isPaused ? "Resume game" : "Pause game"} disabled={controlsDisabled}>
        {isPaused ? <Play className="h-5 w-5 fill-current" /> : <Pause className="h-5 w-5 fill-current" />}
      </Button>
      <Button variant={isFastForward ? hcVariant(isHighContrast ?? false) : "ghost"} size="icon" onClick={onToggleFastForward} aria-label={isFastForward ? "Disable fast forward" : "Enable fast forward"} disabled={isPaused || controlsDisabled}>
        <FastForward className={`h-5 w-5 ${isFastForward ? "fill-current" : ""}`} />
      </Button>
    </>
  );
}

export function AppHeader({ onAccessibilityClick, onHelpClick, onQuitClick, isPaused, isFastForward, onTogglePause, onToggleFastForward, onAlertsClick, onHintsClick, onBriefingClick, alertsCount, hintsCount, controlsDisabled, isBlackout, isHighContrast }: AppHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const timeControlProps = { isPaused, isFastForward, onTogglePause, onToggleFastForward, controlsDisabled, isHighContrast };

  return (
    <header className="bg-background flex items-center justify-between border-b px-4 py-3 relative" role="banner" aria-label="Main application header">
      {/* Left: Title & Main Actions */}
      <div className="flex justify-start">
        <div className="flex items-center gap-2 flex-nowrap">
          <h1 className="text-xl sm:text-2xl font-bold font-share-tech text-foreground">
            <span className={isBlackout ? "text-red-600 animate-pulse" : undefined}>Blackout</span> USA
          </h1>
          {/* Desktop Controls */}
          <div className="hidden md:flex items-center gap-1 border-l ml-2 pl-2">
            <TimeControls {...timeControlProps} />
            <Button variant="ghost" size="icon" onClick={onAlertsClick} className="relative" aria-label={`View alerts, ${alertsCount} new notifications`} disabled={controlsDisabled}>
              <Bell className="h-5 w-5" />
              {alertsCount > 0 && <NotificationDot ping color="bg-red-500" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={onHintsClick} className="relative" aria-label={`View hints, ${hintsCount} new items`} disabled={controlsDisabled}>
              <Lightbulb className="h-5 w-5" />
              {hintsCount > 0 && <NotificationDot color="bg-amber-500" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={onBriefingClick} aria-label="View briefing" disabled={controlsDisabled}>
              <FileText className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Right: Desktop Menu & Mobile Toggle */}
      <div className="flex justify-end items-center gap-2">
        {/* Mobile Time Controls */}
        <div className="flex md:hidden items-center gap-1">
          <TimeControls {...timeControlProps} />
        </div>
        <nav aria-label="Utility links" className="hidden md:flex items-center justify-end gap-2 flex-nowrap">
          <div role="group">
            <Button variant="ghost" size="icon" onClick={onAccessibilityClick} aria-label="Accessibility Settings">
              <PersonStanding className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onHelpClick} aria-label="How To Play">
              <HelpCircle className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onQuitClick} aria-label="Quit game">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </nav>

        {/* Mobile Menu Toggle */}
        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)} aria-label="Toggle menu" aria-expanded={isMenuOpen}>
          {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <nav role="navigation" aria-label="Mobile menu" className="absolute top-full left-0 right-0 bg-background border-b shadow-lg z-50 p-4 md:hidden flex flex-col gap-4 animate-in slide-in-from-top-2">
          <div className="grid grid-cols-1 gap-2">
            <Button variant="ghost" onClick={() => { onAlertsClick(); setIsMenuOpen(false); }} className="justify-start relative" disabled={controlsDisabled} aria-label={`View alerts, ${alertsCount} new notifications`}>
              <Bell className="mr-2 h-4 w-4" aria-hidden="true" />
              Alerts
              {alertsCount > 0 && <NotificationDot ping color="bg-red-500" />}
            </Button>
            <Button variant="ghost" onClick={() => { onHintsClick(); setIsMenuOpen(false); }} className="justify-start relative" disabled={controlsDisabled} aria-label={`View hints, ${hintsCount} new items`}>
              <Lightbulb className="mr-2 h-4 w-4" aria-hidden="true" />
              Hints
              {hintsCount > 0 && <NotificationDot color="bg-amber-500" />}
            </Button>
            <Button variant="ghost" onClick={() => { onBriefingClick(); setIsMenuOpen(false); }} className="justify-start" disabled={controlsDisabled}>
              <FileText className="mr-2 h-4 w-4" aria-hidden="true" />
              Briefing
            </Button>
             <Button variant="ghost" onClick={() => { onAccessibilityClick(); setIsMenuOpen(false); }} className="justify-start">
                <PersonStanding className="mr-2 h-4 w-4" aria-hidden="true" />
                Accessibility
             </Button>
             <Button variant="ghost" onClick={() => { onHelpClick(); setIsMenuOpen(false); }} className="justify-start">
                <HelpCircle className="mr-2 h-4 w-4" aria-hidden="true" />
                How to Play
             </Button>
             <Button variant="ghost" onClick={() => { onQuitClick(); setIsMenuOpen(false); }} className="justify-start text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20">
                <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
                Quit Game
             </Button>
          </div>
        </nav>
      )}
    </header>
  )
}
"use client"

import { useState, useEffect } from "react"
import { HelpCircle, LogOut, PersonStanding, Play, Pause, FastForward, Bell, Lightbulb, FileText, Menu, X, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn, hcVariant } from "@/lib/utils"
import { useIsPaused, useIsFastForward, useActions, useAlerts, useHints } from "@/lib/hooks/use-store"
import type { ModalId } from "@/lib/hooks/use-modals"

function NotificationDot({ ping, color }: { ping?: boolean; color: string }) {
  return (
    <span className="absolute top-1 right-1 flex h-2 w-2" aria-hidden="true">
      {ping && <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${color} opacity-75`} />}
      <span className={`relative inline-flex rounded-full h-2 w-2 ${color}`} />
    </span>
  );
}

function TimeControls({ isPaused, isFastForward, onTogglePause, onToggleFastForward, controlsDisabled, isHighContrast }: {
  isPaused: boolean;
  isFastForward: boolean;
  onTogglePause: () => void;
  onToggleFastForward: () => void;
  controlsDisabled?: boolean;
  isHighContrast?: boolean;
}) {
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

interface AppHeaderProps {
  onOpenModal: (id: ModalId) => void;
  onBriefingClick: () => void;
  controlsDisabled?: boolean;
  isHighContrast?: boolean;
  isBlackout?: boolean;
}

export function AppHeader({ onOpenModal, onBriefingClick, controlsDisabled, isHighContrast, isBlackout }: AppHeaderProps) {
  const isPaused = useIsPaused();
  const isFastForward = useIsFastForward();
  const { togglePause, toggleFastForward } = useActions();
  const alerts = useAlerts();
  const hints = useHints();
  const alertsCount = alerts.length;
  const hintsCount = hints.length;

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Track the latest critical alert to show inline
  const [visibleAlert, setVisibleAlert] = useState<{ id: number; message: string } | null>(null);
  const [lastShownId, setLastShownId] = useState<number | null>(null);

  useEffect(() => {
    if (alerts.length === 0) return;
    const latest = alerts[0];
    if (!latest.critical) return;
    if (latest.id === lastShownId) return;

    setVisibleAlert({ id: latest.id, message: latest.message });
    setLastShownId(latest.id);

    const timer = setTimeout(() => setVisibleAlert(null), 5000);
    return () => clearTimeout(timer);
  }, [alerts, lastShownId]);

  return (
    <header className="bg-background flex items-center border-b px-4 py-3 relative gap-3" role="banner" aria-label="Main application header">
      {/* Left: Title & Main Actions */}
      <div className="flex shrink-0">
        <div className="flex items-center gap-2 flex-nowrap">
          <h1 className="text-xl sm:text-2xl font-bold font-share-tech text-foreground">
            <span className={isBlackout ? "text-[var(--color-alert-emphasis)] animate-pulse" : undefined}>Blackout</span> USA
          </h1>
          {/* Desktop Controls */}
          <div className="hidden md:flex items-center gap-1 border-l ml-2 pl-2">
            <TimeControls isPaused={isPaused} isFastForward={isFastForward} onTogglePause={togglePause} onToggleFastForward={toggleFastForward} controlsDisabled={controlsDisabled} isHighContrast={isHighContrast} />
            <Button variant="ghost" size="icon" onClick={() => onOpenModal('alerts')} className={cn("relative", alertsCount > 0 && "text-[var(--color-alert)]")} aria-label={`View alerts, ${alertsCount} new notifications`} disabled={controlsDisabled}>
              <Bell className="h-5 w-5" />
              {alertsCount > 0 && <NotificationDot ping color="bg-[var(--color-alert)]" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onOpenModal('hints')} className="relative" aria-label={`View hints, ${hintsCount} new items`} disabled={controlsDisabled}>
              <Lightbulb className="h-5 w-5" />
              {hintsCount > 0 && <NotificationDot color="bg-[var(--color-hint)]" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={onBriefingClick} aria-label="View briefing" disabled={controlsDisabled}>
              <FileText className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Center: Latest critical alert (desktop only) */}
      {visibleAlert ? (
        <div className="hidden md:flex flex-1 min-w-0 items-center justify-center gap-2 animate-in fade-in duration-300" role="alert">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0" aria-hidden="true" />
          <p className="text-sm font-medium text-destructive truncate">{visibleAlert.message}</p>
          <button
            onClick={() => setVisibleAlert(null)}
            className="text-destructive/60 hover:text-destructive shrink-0"
            aria-label="Dismiss alert"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div className="hidden md:block flex-1" />
      )}

      {/* Right: Desktop Menu & Mobile Toggle */}
      <div className="flex shrink-0 items-center gap-2">
        {/* Mobile Time Controls */}
        <div className="flex md:hidden items-center gap-1">
          <TimeControls isPaused={isPaused} isFastForward={isFastForward} onTogglePause={togglePause} onToggleFastForward={toggleFastForward} controlsDisabled={controlsDisabled} isHighContrast={isHighContrast} />
        </div>
        <nav aria-label="Utility links" className="hidden md:flex items-center justify-end gap-2 flex-nowrap">
          <div role="group">
            <Button variant="ghost" size="icon" onClick={() => onOpenModal('accessibility')} aria-label="Accessibility Settings">
              <PersonStanding className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onOpenModal('help')} aria-label="How To Play">
              <HelpCircle className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onOpenModal('quit')} aria-label="Quit game">
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
            <Button variant="ghost" onClick={() => { onOpenModal('alerts'); setIsMenuOpen(false); }} className="justify-start relative" disabled={controlsDisabled} aria-label={`View alerts, ${alertsCount} new notifications`}>
              <Bell className="mr-2 h-4 w-4" aria-hidden="true" />
              Alerts
              {alertsCount > 0 && <NotificationDot ping color="bg-[var(--color-alert)]" />}
            </Button>
            <Button variant="ghost" onClick={() => { onOpenModal('hints'); setIsMenuOpen(false); }} className="justify-start relative" disabled={controlsDisabled} aria-label={`View hints, ${hintsCount} new items`}>
              <Lightbulb className="mr-2 h-4 w-4" aria-hidden="true" />
              Hints
              {hintsCount > 0 && <NotificationDot color="bg-[var(--color-hint)]" />}
            </Button>
            <Button variant="ghost" onClick={() => { onBriefingClick(); setIsMenuOpen(false); }} className="justify-start" disabled={controlsDisabled}>
              <FileText className="mr-2 h-4 w-4" aria-hidden="true" />
              Briefing
            </Button>
             <Button variant="ghost" onClick={() => { onOpenModal('accessibility'); setIsMenuOpen(false); }} className="justify-start">
                <PersonStanding className="mr-2 h-4 w-4" aria-hidden="true" />
                Accessibility
             </Button>
             <Button variant="ghost" onClick={() => { onOpenModal('help'); setIsMenuOpen(false); }} className="justify-start">
                <HelpCircle className="mr-2 h-4 w-4" aria-hidden="true" />
                How to Play
             </Button>
             <Button variant="ghost" onClick={() => { onOpenModal('quit'); setIsMenuOpen(false); }} className="justify-start text-[var(--color-alert)] hover:text-[var(--color-alert-emphasis)] hover:bg-[var(--color-alert)]/10">
                <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
                Quit Game
             </Button>
          </div>
        </nav>
      )}
    </header>
  )
}

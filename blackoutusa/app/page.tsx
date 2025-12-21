"use client";

import { useState, useEffect, useRef } from "react"
import { useTheme } from "next-themes"
import { HelpCircle, X, AlertTriangle, Sun, Moon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AppSidebar } from "@/components/app-sidebar"
import { GameEngine } from "@/lib/game/engine"
import { DashboardStats, Substation, Branch, Alert, AlertHandler } from "@/lib/game/types"
import { SubstationModal } from "@/components/modals/substation-modal"
import { BranchModal } from "@/components/modals/branch-modal"
import { WelcomeModal } from "@/components/modals/welcome-modal"
import { HelpModal } from "@/components/modals/help-modal"
import { AlertsModal } from "@/components/modals/alerts-modal"
import { QuitModal } from "@/components/modals/quit-modal"
import { FinishedModal } from "@/components/modals/finished-modal"

export default function Page() {
  // Modal States
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(false)
  const [isAlertsOpen, setIsAlertsOpen] = useState(false)
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const [isQuitOpen, setIsQuitOpen] = useState(false)
  const [isFinishedOpen, setIsFinishedOpen] = useState(false)
  const [selectedSub, setSelectedSub] = useState<Substation | null>(null)
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null)

  // Game States
  const [day, setDay] = useState(0) // Start at 0, set to 1 on game start
  const [isPaused, setIsPaused] = useState(true)
  const [isFastForward, setIsFastForward] = useState(false)
  const [alerts, setAlerts] = useState<Array<{id: number, time: string, message: string, critical: boolean}>>([])

  // Theme
  const { resolvedTheme, setTheme } = useTheme()
  
  // Refs for loop access
  const isPausedRef = useRef(isPaused)
  const isFastForwardRef = useRef(isFastForward)

  // Sync refs with state
  useEffect(() => {
    isPausedRef.current = isPaused
  }, [isPaused])

  useEffect(() => {
    isFastForwardRef.current = isFastForward
  }, [isFastForward])

  useEffect(() => {
    if (engineRef.current && resolvedTheme) {
      engineRef.current.setTheme(resolvedTheme as 'light' | 'dark');
    }
  }, [resolvedTheme]);

  // Engine Integration
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<GameEngine | null>(null)
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | undefined>(undefined)

  useEffect(() => {
    setIsWelcomeOpen(true)
    
    // Initialize Engine
    if (canvasRef.current && !engineRef.current) {
      engineRef.current = new GameEngine(canvasRef.current);

      // Set initial theme right after creation to prevent flicker/mismatch
      if (resolvedTheme) {
        engineRef.current.setTheme(resolvedTheme as 'light' | 'dark');
      }

      // --- Connect Engine to React UI ---
      engineRef.current.onInteract = (type, data) => {
        if (type === 'sub') {
          setSelectedSub(data as Substation);
        } else if (type === 'branch') {
          setSelectedBranch(data as Branch);
        }
      };

      engineRef.current.onAlert = (alert: Alert, reset?: boolean) => {
        const timeStr = engineRef.current?.getDashboardStats().timeStr || "1:00 PM";
        setAlerts(prevAlerts => {
          // The new ID is the highest existing ID + 1, or 0 if resetting.
          const nextId = (reset || prevAlerts.length === 0) ? 0 : (prevAlerts[0].id + 1);
          const newAlert = { id: nextId, time: timeStr, ...alert };
          if (reset) {
            return [newAlert];
          }
          return [newAlert, ...prevAlerts];
        });
      };
      
      // Start Animation Loop
      let animationFrameId: number;
      let lastUiUpdate = 0;
      let lastGameStepTime = 0;
      
      const loop = (timestamp: number) => {
        if (engineRef.current) {
          // Update Logic
          if (!isPausedRef.current) {
            const gameSpeed = isFastForwardRef.current ? 50 : 500; // ms per game minute
            if (timestamp - lastGameStepTime > gameSpeed) {
              const isDayOver = engineRef.current.update(1);
              lastGameStepTime = timestamp;
              if (isDayOver) {
                setIsPaused(true);
                setIsFinishedOpen(true);
              }
            }
          }
          
          // Draw
          engineRef.current.draw();
          
          // Sync UI (Throttle to ~10fps to save React renders)
          if (timestamp - lastUiUpdate > 100) {
            setDashboardStats(engineRef.current.getDashboardStats());
            lastUiUpdate = timestamp;
          }
        }
        animationFrameId = requestAnimationFrame(loop);
      };
      
      animationFrameId = requestAnimationFrame(loop);
      
      return () => cancelAnimationFrame(animationFrameId);
    }
  }, [])

  // Logic ported from script.js start_day1() and start_day()
  const startGameForDay = (dayToStart: number) => {
    engineRef.current?.startDay(dayToStart);
  }

  const handleStartGame = () => {
    setIsWelcomeOpen(false)
    setDay(1)
    startGameForDay(1);
    setIsHelpOpen(true)
    setIsPaused(true) // pause_modal() behavior
  }

  const removeAlert = (id: number) => {
    setAlerts(prev => prev.filter(a => a.id !== id))
  }

  const togglePause = () => {
    setIsPaused(!isPaused)
    if (isPaused) setIsFastForward(false) // If unpausing, go to normal speed
  }

  const toggleFastForward = () => {
    if (isFastForward) {
      setIsFastForward(false) // Go back to normal
    } else {
      setIsFastForward(true)
      setIsPaused(false) // Unpause if paused
    }
  }

  const handleUnitAction = (subId: string, unitIndex: number) => {
    engineRef.current?.toggleUnitStatus(subId, unitIndex);
    setSelectedSub(engineRef.current?.state.subs[subId] || null); // Refresh modal data
  }

  const handleSetSetpoint = (subId: string, unitIndex: number, newSetpoint: number) => {
    engineRef.current?.setUnitSetpoint(subId, unitIndex, newSetpoint);
    // Refresh the modal data to reflect the change immediately in the "Pset" value,
    // though the input field itself maintains its own state.
    setSelectedSub(engineRef.current?.state.subs[subId] || null);
  }

  const handleReplayDay = () => {
    startGameForDay(day);
    setIsFinishedOpen(false);
    setIsQuitOpen(false);
    setIsPaused(false);
  }

  const handleNextDay = () => {
    const nextDay = day < 5 ? day + 1 : 1;
    setDay(nextDay);
    startGameForDay(nextDay);
    setIsFinishedOpen(false);
    setIsQuitOpen(false);
    setIsPaused(false);
  }

  const handleQuitToStart = () => {
    window.location.reload(); // Simplest way to reset everything
  }

  const handleSubstationSelect = (sub: Substation) => {
    setSelectedSub(sub);
  }

  const handleBranchSelect = (branch: Branch) => {
    setSelectedBranch(branch);
  }

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden">
      <header className="bg-background sticky top-0 flex shrink-0 items-center gap-2 border-b p-4 h-16 z-50">
        <h2 className="text-2xl font-bold font-share-tech text-foreground mr-4">
          Blackout USA
        </h2>
        <div className="ml-auto flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm font-medium max-w-[300px] lg:max-w-[500px] hidden md:flex">
            <AlertTriangle className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="truncate" title={alerts.length > 0 ? alerts[0].message : "No alerts to show"}>
              {alerts.length > 0 ? alerts[0].message : "No alerts to show"}
            </span>
          </div>
          <Button variant="outline" onClick={() => setIsAlertsOpen(true)} className="cursor-pointer">
            View all Alerts
          </Button>
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
            onClick={() => {
              setIsHelpOpen(true)
              setIsPaused(true)
            }}
            title="Help"
            className="cursor-pointer"
          >
            <HelpCircle className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsQuitOpen(true)}
            title="Quit"
            className="cursor-pointer"
          >
            <X className="h-4 w-4" />
          </Button>
          </div>
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <AppSidebar 
          stats={dashboardStats} 
          day={day}
          isPaused={isPaused}
          isFastForward={isFastForward}
          onTogglePause={togglePause}
          onToggleFastForward={toggleFastForward}
          subs={engineRef.current?.state.subs}
          branches={engineRef.current?.state.branches}
          onSubstationSelect={handleSubstationSelect}
          onBranchSelect={handleBranchSelect}
        />
        <main className="flex-1 flex flex-col overflow-hidden relative min-w-0">
        <div className="game-wrapper relative h-full w-full">
          <canvas
            ref={canvasRef}
            tabIndex={1}
            className="h-full w-full"
          ></canvas>
          {/* Modals */}
          <WelcomeModal 
            open={isWelcomeOpen} 
            onOpenChange={setIsWelcomeOpen} 
            onStartGame={handleStartGame} 
          />

          {/* Alerts Modal */}
          <AlertsModal
            open={isAlertsOpen}
            onOpenChange={setIsAlertsOpen}
            alerts={alerts}
            onRemoveAlert={removeAlert}
          />

          {/* Help Modal */}
          <HelpModal 
            open={isHelpOpen} 
            onOpenChange={(open) => {
              setIsHelpOpen(open)
              if (!open) setIsPaused(false)
            }} 
            day={day} 
          />

          {/* === NEW DYNAMIC MODALS === */}
          <SubstationModal 
            sub={selectedSub} 
            onClose={() => setSelectedSub(null)} 
            onUnitAction={handleUnitAction}
            onSetSetpoint={handleSetSetpoint}
            frWind={dashboardStats?.fr_wind}
            frSolar={dashboardStats?.fr_solar}
          />
          <BranchModal branch={selectedBranch} onClose={() => setSelectedBranch(null)} onCircuitAction={(branchId, circuit) => engineRef.current?.toggleBranchCircuitStatus(branchId, circuit)} />

          {/* Finished Day Modal */}
          <FinishedModal 
            open={isFinishedOpen}
            onOpenChange={setIsFinishedOpen}
            stats={dashboardStats}
            day={day}
            onNextDay={handleNextDay}
            onReplay={handleReplayDay}
            onQuit={handleQuitToStart}
          />

          <QuitModal
            open={isQuitOpen}
            onOpenChange={setIsQuitOpen}
            onQuitToStart={handleQuitToStart}
            onReplayDay={handleReplayDay}
            onNextDay={handleNextDay}
          />
        </div>
        </main>
      </div>
    </div>
  )
}

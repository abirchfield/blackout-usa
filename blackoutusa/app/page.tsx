"use client";

import { useState, useEffect, useRef } from "react"
import { useTheme } from "next-themes"
import { GameEngine } from "@/lib/game/engine"
import { DashboardStats, Substation, Branch, Alert, AlertHandler } from "@/lib/game/types"
import { AppHeader } from "@/components/app-header"
import { AppSidebar } from "@/components/app-sidebar"
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
  const [isPaused, setIsPaused] = useState(true)
  const [isFastForward, setIsFastForward] = useState(false)
  const [alerts, setAlerts] = useState<Array<{id: number, time: string, message: string, critical: boolean}>>([])
  const [statsHistory, setStatsHistory] = useState<DashboardStats[]>([])

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
      let lastGameStepTime = 0;
      
      const loop = (timestamp: number) => {
        if (engineRef.current) {
          // Update Logic
          if (!isPausedRef.current) {
            const gameSpeed = isFastForwardRef.current ? 50 : 500; // ms per game minute
            if (timestamp - lastGameStepTime > gameSpeed) {
              const isDayOver = engineRef.current.update(1);
              lastGameStepTime = timestamp;

              // Get latest stats and update React state
              const newStats = engineRef.current.getDashboardStats();
              setDashboardStats(newStats);
              setStatsHistory(prev => [...prev, newStats]);

              if (isDayOver) {
                setIsPaused(true);
                setIsFinishedOpen(true);
              }
            }
          }
          
          // Draw
          engineRef.current.draw();
          
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
    setStatsHistory([]); // Reset history for the new day
  }

  const handleStartGame = () => {
    setIsWelcomeOpen(false)
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
    startGameForDay(dashboardStats?.day || 1);
    setIsFinishedOpen(false);
    setIsQuitOpen(false);
    setIsPaused(false);
  }

  const handleNextDay = () => {
    const currentDay = dashboardStats?.day || 1;
    const nextDay = currentDay < 5 ? currentDay + 1 : 1;
    startGameForDay(nextDay)
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
      <AppHeader
        alerts={alerts}
        onAlertsClick={() => setIsAlertsOpen(true)}
        onHelpClick={() => {
          setIsHelpOpen(true);
          setIsPaused(true);
        }}
        onQuitClick={() => setIsQuitOpen(true)}
      />
      <div className="flex flex-1 overflow-hidden">
        <AppSidebar
          stats={dashboardStats}
          isPaused={isPaused}
          isFastForward={isFastForward}
          onTogglePause={togglePause}
          onToggleFastForward={toggleFastForward}
          subs={engineRef.current?.state.subs}
          branches={engineRef.current?.state.branches}
          statsHistory={statsHistory}
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
            day={dashboardStats?.day || 1} 
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
            day={dashboardStats?.day || 1}
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

"use client";

import { useState, useEffect, useRef } from "react"
import { Play, Pause, FastForward, HelpCircle, X, AlertTriangle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AppSidebar } from "@/components/app-sidebar"
import { GameEngine } from "@/lib/game/engine"
import { DashboardStats, Substation, Branch } from "@/lib/game/types"
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
  const [isPaused, setIsPaused] = useState(false)
  const [isFastForward, setIsFastForward] = useState(false)
  const [alerts, setAlerts] = useState<Array<{id: number, time: string, message: string, critical: boolean}>>([])
  const [alertIdCounter, setAlertIdCounter] = useState(0)
  
  // Engine Integration
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<GameEngine | null>(null)
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | undefined>(undefined)

  useEffect(() => {
    setIsWelcomeOpen(true)
    
    // Initialize Engine
    if (canvasRef.current && !engineRef.current) {
      engineRef.current = new GameEngine(canvasRef.current);

      // --- Connect Engine to React UI ---
      engineRef.current.onInteract = (type, data) => {
        if (type === 'sub') {
          setSelectedSub(data as Substation);
        } else if (type === 'branch') {
          setSelectedBranch(data as Branch);
        }
      };
      
      // Start Animation Loop
      let animationFrameId: number;
      let lastUiUpdate = 0;
      let lastGameStepTime = 0;
      
      const loop = (timestamp: number) => {
        if (engineRef.current) {
          // Update Logic
          if (!isPaused) {
            const gameSpeed = isFastForward ? 50 : 500; // ms per game minute
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
  const handleStartGame = () => {
    setIsWelcomeOpen(false)
    setDay(1)
    
    // Reset alerts and add Day 1 hints (simulated from script.js)
    const initialAlerts = [
      { message: "Your shift has started. Click \"View all Alerts\" to see additional hints for what to do.", critical: false },
      { message: "Hint #1: The McCamey Solar PV plant in West Texas is currently disconnected. You might as well start up all 3 units at that plant to get more, low-cost energy.", critical: false },
      { message: "Hint #2: The Mission Gas Turbine plant in South Texas has very high costs. Try shutting down 1-3 of these units while you still have plenty of reserves.", critical: false },
      { message: "Hint #3: You are going to need more reserves in the evening once the solar has gone down and the load is higher.", critical: false },
      { message: "Hint #4: For the rest of the day, watch the reserves carefully. If they get below 500 MW you need to find new generation to start up.", critical: false },
    ]
    
    // Add them in reverse order so the first one appears at the top (like prepend)
    const newAlerts = initialAlerts.map((a, i) => ({
      id: i,
      time: "1:00 PM",
      message: a.message,
      critical: a.critical
    }))
    setAlerts(newAlerts)
    setAlertIdCounter(initialAlerts.length)

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

  const handleReplayDay = () => {
    engineRef.current?.setDefaults();
    // Logic to re-add alerts for the current day would go here
    setIsFinishedOpen(false);
    setIsPaused(false);
  }

  const handleNextDay = () => {
    const nextDay = day < 5 ? day + 1 : 1;
    setDay(nextDay);
    engineRef.current?.setDefaults();
    // Logic to add alerts for the *next* day would go here
    setIsFinishedOpen(false);
    setIsPaused(false);
  }

  const handleQuitToStart = () => {
    window.location.reload(); // Simplest way to reset everything
  }

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden">
      <header className="bg-background sticky top-0 flex shrink-0 items-center gap-2 border-b p-4 h-16 z-50">
        <h2 className="text-2xl font-bold font-share-tech text-foreground mr-4">
          Blackout USA
        </h2>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={togglePause}
            title={isPaused ? "Resume" : "Pause"}
            className="cursor-pointer"
          >
            {isPaused ? <Play className="h-4 w-4 text-red-500" /> : <Pause className="h-4 w-4" />}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={toggleFastForward}
            title={isFastForward ? "Normal Speed" : "Fast Forward"}
            className="cursor-pointer"
          >
            {isFastForward ? <Play className="h-4 w-4 text-green-500" /> : <FastForward className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsHelpOpen(true)}
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
      </header>
      <div className="flex flex-1 overflow-hidden">
        <AppSidebar stats={dashboardStats} />
        <main className="flex-1 flex flex-col overflow-hidden relative min-w-0">
        <div className="game-wrapper relative h-full w-full">
          <div className="main-section">
            <div className="canvas-box" id="canvas-box-obj">
              <canvas
                ref={canvasRef}
                tabIndex={1}
                id="main-canvas-id"
                className="main-canvas"
              ></canvas>
            </div>
          </div>

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
            onOpenChange={setIsHelpOpen} 
            day={day} 
          />

          {/* === NEW DYNAMIC MODALS === */}
          <SubstationModal sub={selectedSub} onClose={() => setSelectedSub(null)} onUnitAction={handleUnitAction} />
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
      <footer className="flex h-16 shrink-0 items-center justify-between border-t bg-background px-4 text-foreground shadow-sm z-10">
        <Button variant="outline" onClick={() => setIsAlertsOpen(true)} className="shrink-0 mr-4 cursor-pointer">
          View all Alerts
        </Button>
        <div className="flex flex-1 items-center gap-2 text-sm font-medium min-w-0">
          <AlertTriangle className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="truncate">
            {alerts.length > 0 ? alerts[0].message : "No alerts to show"}
          </span>
        </div>
      </footer>
    </div>
  )
}

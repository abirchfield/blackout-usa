"use client";

import { useState, useEffect, useRef } from "react"
import { useTheme } from "next-themes"
import { scenarios, ResultDetails } from "@/lib/game/scenarios"
import { GameEngine } from "@/lib/game/engine"
import { DashboardStats, Substation, Branch, Alert, Hint, Briefing } from "@/lib/game/types"
import { AppHeader } from "@/components/app-header"
import { AppSidebar } from "@/components/app-sidebar"
import { RightSidebar } from "@/components/right-sidebar"
import { SubstationModal } from "@/components/modals/substation-modal"
import { BranchModal } from "@/components/modals/branch-modal"
import { WelcomeModal } from "@/components/modals/welcome-modal"
import { HelpModal } from "@/components/modals/help-modal"
import { QuitModal } from "@/components/modals/quit-modal"
import { Button } from "@/components/ui/button"

const initialDashboardStats: DashboardStats = {
  day: 1,
  timeStr: "1:00 PM",
  timeStep: 0,
  frequency: 60.0,
  loadServed: 0,
  loadUnserved: 0,
  reserves: 0,
  windGen: 0,
  solarGen: 0,
  thermalGen: 0,
  nuclearGen: 0,
  avgCost: 0,
  totalCost: 0,
  currentOpCost: 0,
  currentFuelCost: 0,
  currentUnservedCost: 0,
  totalOpCost: 0,
  totalFuelCost: 0,
  totalUnservedCost: 0,
  fr_wind: 1,
  fr_solar: 1,
};

export default function Page() {
  // Modal States
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(false)
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const [isQuitOpen, setIsQuitOpen] = useState(false)
  const [selectedSub, setSelectedSub] = useState<Substation | null>(null)
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null)
  const [currentBriefing, setCurrentBriefing] = useState<Briefing | null>(null)
  const [isInitialTutorial, setIsInitialTutorial] = useState(false)

  // Game States
  const [isPaused, setIsPaused] = useState(true)
  const [isUserPaused, setIsUserPaused] = useState(true) // For user-initiated pause/play
  const [isDayFinished, setIsDayFinished] = useState(false)
  const [isFastForward, setIsFastForward] = useState(false)
  const [alerts, setAlerts] = useState<Array<{id: number, time: string, message: string, critical: boolean}>>([])
  const [hints, setHints] = useState<Array<{id: number, time: string, message: string}>>([])
  const [statsHistory, setStatsHistory] = useState<DashboardStats[]>([])
  const [targetDay, setTargetDay] = useState(1)
  const [isDayTransition, setIsDayTransition] = useState(false)
  const [completedDays, setCompletedDays] = useState<Set<number>>(new Set());
  const [dayResultDetails, setDayResultDetails] = useState<ResultDetails | null>(null);
  const [rightSidebarTab, setRightSidebarTab] = useState('brief');

  // Theme
  const { resolvedTheme } = useTheme()
  
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

  // Engine Integration
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<GameEngine | null>(null)
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>(initialDashboardStats)

  // Calculate progress for the header's time controller
  const timeStep = dashboardStats?.timeStep || 0;
  const progress = Math.min(100, Math.max(0, (timeStep / GameEngine.GAME_DURATION) * 100));

  useEffect(() => {
    setIsWelcomeOpen(true)
    
    // Initialize Engine
    if (canvasRef.current && !engineRef.current) {
      engineRef.current = new GameEngine(canvasRef.current);

      // Set initial UI state before game starts
      const initialStats = engineRef.current.getDashboardStats();
      setDashboardStats(initialStats);
      const initialBriefing = engineRef.current.getBriefingForDay(initialStats.day);
      setCurrentBriefing(initialBriefing);
      setTargetDay(initialStats.day);

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

      engineRef.current.onHint = (hint: Hint, reset?: boolean) => {
        const timeStr = engineRef.current?.getDashboardStats().timeStr || "1:00 PM";
        setHints(prevHints => {
          const nextId = (reset || prevHints.length === 0) ? 0 : (prevHints[0].id + 1);
          const newHint = { id: nextId, time: timeStr, ...hint };
          if (reset) {
            return [newHint];
          }
          return [newHint, ...prevHints];
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
                setIsDayFinished(true);
                setCompletedDays(prev => new Set(prev).add(newStats.day));
                setRightSidebarTab('brief');
                const results = engineRef.current?.getResultsForDay(newStats.day, newStats.totalCost);
                setDayResultDetails(results || null);
              }
            }
          }
          
          // Draw
          engineRef.current.draw(isPausedRef.current, isFastForwardRef.current);
          
        }
        animationFrameId = requestAnimationFrame(loop);
      };
      
      animationFrameId = requestAnimationFrame(loop);
      
      return () => cancelAnimationFrame(animationFrameId);
    }
  }, [])

  useEffect(() => {
    if (engineRef.current && resolvedTheme) {
      engineRef.current.setTheme(resolvedTheme as 'light' | 'dark');
    }
  }, [resolvedTheme]);

  // Centralized logic for pausing the game.
  // The game is paused if any modal is open, if we are between days,
  // if the day is over, or if the user explicitly paused it.
  useEffect(() => {
    const gameShouldBePaused =
      isWelcomeOpen ||
      isHelpOpen ||
      isQuitOpen ||
      isDayTransition ||
      isDayFinished ||
      isUserPaused;
    setIsPaused(gameShouldBePaused);
  }, [isWelcomeOpen, isHelpOpen, isQuitOpen, isDayTransition, isDayFinished, isUserPaused]);

  const showBriefingForDay = (dayToShow: number) => {
    setTargetDay(dayToShow);
    const briefing = engineRef.current?.getBriefingForDay(dayToShow);
    setCurrentBriefing(briefing || null);
    setIsDayTransition(true);
    setRightSidebarTab('brief');
  }

  const handleHowToPlay = () => {
    setIsWelcomeOpen(false);
    setStatsHistory([]);
    setIsHelpOpen(true);
    setIsInitialTutorial(true);
  };

  const handleStartGame = () => {
    setIsWelcomeOpen(false);
    setStatsHistory([]);
    setIsDayTransition(true);
    setIsInitialTutorial(false); // This is now the direct path, skipping the tutorial.
  };

  const removeAlert = (id: number) => {
    setAlerts(prev => prev.filter(a => a.id !== id))
  }

  const removeHint = (id: number) => {
    setHints(prev => prev.filter(h => h.id !== id))
  }

  const togglePause = () => {
    setIsUserPaused(prev => !prev);
    // If we are unpausing, ensure fast-forward is off.
    if (isUserPaused) {
      setIsFastForward(false);
    }
  }

  const toggleFastForward = () => {
    if (isFastForward) {
      setIsFastForward(false) // Go back to normal
    } else {
      setIsFastForward(true);
      setIsUserPaused(false); // Signal user's intent to play
    }
  }

  const handleStartDay = () => {
    if (isDayTransition) {
      engineRef.current?.startDay(targetDay);
      setStatsHistory([]);
      setIsDayTransition(false); // Reset flag
      setIsUserPaused(false); // Start the game
      setDayResultDetails(null);
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
  
  const handleReplayDay = (currentDay: number) => {
    showBriefingForDay(currentDay);
    setIsDayFinished(false);
    setDayResultDetails(null);
    setIsQuitOpen(false);
  }

  const handleNextDay = (currentDay: number) => {
    const totalDays = Object.keys(scenarios).length;
    const nextDay = currentDay < totalDays ? currentDay + 1 : 1;
    showBriefingForDay(nextDay);
    setIsDayFinished(false);
    setDayResultDetails(null);
    setIsQuitOpen(false);
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
        stats={dashboardStats}
        onHelpClick={() => {
          setIsHelpOpen(true);
        }}
        onQuitClick={() => {
          setIsQuitOpen(true);
        }}
        progress={progress}
        isPaused={isPaused}
        isFastForward={isFastForward}
        onTogglePause={togglePause}
        onToggleFastForward={toggleFastForward}
      />
      <div className="flex flex-1 overflow-hidden">
        <AppSidebar
          stats={dashboardStats}
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
            onHowToPlay={handleHowToPlay}
          />

          {/* Help Modal */}
          <HelpModal 
            open={isHelpOpen} 
            onOpenChange={(open) => {
              setIsHelpOpen(open);
              if (!open && isInitialTutorial) { // After tutorial, show briefing
                setIsDayTransition(true);
                setIsInitialTutorial(false);
              }
            }} 
          />

          {/* === NEW DYNAMIC MODALS === */}
          <SubstationModal 
            sub={selectedSub} 
            onClose={() => setSelectedSub(null)} 
            onUnitAction={handleUnitAction}
            onSetSetpoint={handleSetSetpoint}
            frWind={dashboardStats?.fr_wind}
            frSolar={dashboardStats?.fr_solar}
            isPaused={isPaused}
          />
          <BranchModal branch={selectedBranch} onClose={() => setSelectedBranch(null)} onCircuitAction={(branchId, circuit) => engineRef.current?.toggleBranchCircuitStatus(branchId, circuit)} isPaused={isPaused} />

          <QuitModal
            open={isQuitOpen}
            onOpenChange={(open) => {
              setIsQuitOpen(open);
              // Pause/resume is now handled by the central useEffect
            }}
            day={dashboardStats?.day || 1}
            onQuitToStart={handleQuitToStart}
            onReplayDay={handleReplayDay}
            onNextDay={handleNextDay}
          />
        </div>
        </main>
        <RightSidebar
          stats={dashboardStats}
          briefing={currentBriefing}
          alerts={alerts}
          onRemoveAlert={removeAlert}
          hints={hints}
          onRemoveHint={removeHint}
          isDayFinished={isDayFinished}
          isDayTransition={isDayTransition}
          targetDay={targetDay}
          totalDays={Object.keys(scenarios).length}
          completedDays={Array.from(completedDays)}
          onStartDay={handleStartDay}
          onNextDay={handleNextDay}
          onReplayDay={handleReplayDay}
          dayResultDetails={dayResultDetails}
          activeTab={rightSidebarTab}
          onTabChange={setRightSidebarTab}
        />
      </div>
    </div>
  )
}

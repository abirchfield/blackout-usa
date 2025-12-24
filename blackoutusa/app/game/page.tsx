"use client";

import { useState, useEffect, useRef, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"
import { scenarios, ResultDetails } from "@/lib/game/scenario/scenarios"
import { GameEngine } from "@/lib/game/engine";
import { GameStatistics, Substation, Branch, Alert, Hint, Briefing } from "@/lib/game/types"
import { AppHeader } from "@/components/header"
import { Sidebar, SidebarContent } from "@/components/ui/sidebar"
import { EnergyStats } from "@/components/sidebar/left-sidebar"
import { RightSidebar } from "@/components/sidebar/right-sidebar"
import { SubstationModal } from "@/components/modals/substation-modal"
import { BranchModal } from "@/components/modals/branch-modal"
import { QuitModal } from "@/components/modals/quit-modal"
import { AccessibilityModal } from "@/components/modals/accessibility-modal"
import { SubstationsList } from "@/components/lists/substation-list"
import { BranchesList } from "@/components/lists/branch-list"
import { SubstationIcon } from "@/components/icons/substation-icon"
import { LinesIcon } from "@/components/icons/lines-icon"
import { HelpModal } from "@/components/modals/help-modal"
import { KeyBindings, defaultKeyBindings } from "@/lib/game/key-bindings"

const isStaticExport = process.env.NODE_ENV === 'production';

const initialGameStatistics: GameStatistics = {
  day: 1,
  timeStr: "1:00 PM",
  timeStep: 0,
  frequency: 60.0,
  loadServed: 0,
  loadUnserved: 0,
  reserves: 0,
  reservesWind: 0,
  reservesSolar: 0,
  reservesThermal: 0,
  reservesNuclear: 0,
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
  totalMwh: 0
};

function GamePageContent() {
  // Modal States
  const [isQuitOpen, setIsQuitOpen] = useState(false)
  const [isAccessibilityOpen, setIsAccessibilityOpen] = useState(false)
  const [selectedSub, setSelectedSub] = useState<Substation | null>(null)
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null)
  const [currentBriefing, setCurrentBriefing] = useState<Briefing | null>(null)
  const [isInitialTutorial, setIsInitialTutorial] = useState(false)

  const [isHelpOpen, setIsHelpOpen] = useState(false)
  // Game States
  const [isPaused, setIsPaused] = useState(true)
  const [isUserPaused, setIsUserPaused] = useState(true) // For user-initiated pause/play
  const [isDayFinished, setIsDayFinished] = useState(false)
  const [isFastForward, setIsFastForward] = useState(false)
  const [alerts, setAlerts] = useState<Array<{id: number, time: string, message: string, critical: boolean}>>([])
  const [hints, setHints] = useState<Array<{id: number, time: string, message: string}>>([])
  const [targetDay, setTargetDay] = useState(1)
  const [completedDays, setCompletedDays] = useState<Set<number>>(new Set());
  const [dayResultDetails, setDayResultDetails] = useState<ResultDetails | null>(null);
  const [rightSidebarTab, setRightSidebarTab] = useState('brief');
  const [viewMode, setViewMode] = useState<'visual' | 'tabular'>('visual');
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [renderCanvasText, setRenderCanvasText] = useState(true);
  const [keyBindings, setKeyBindings] = useState<KeyBindings>(defaultKeyBindings);

  // Accessibility States
  const [announcement, setAnnouncement] = useState("");
  const [lastAnnouncedAlertId, setLastAnnouncedAlertId] = useState<number | null>(null);

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
  const [gameStatistics, setGameStatistics] = useState<GameStatistics>(initialGameStatistics)

  // Calculate progress for the header's time controller
  const timeStep = gameStatistics?.timeStep || 0;
  const progress = Math.min(100, Math.max(0, (timeStep / GameEngine.GAME_DURATION) * 100));

  const searchParams = useSearchParams();
  const router = useRouter();
  const showTutorial = searchParams.get('tutorial') === 'true';
  const [isDayTransition, setIsDayTransition] = useState(!showTutorial);

  useEffect(() => {
    if (showTutorial) {
      setIsHelpOpen(true);
      setIsInitialTutorial(true);
    }
  }, [showTutorial]);

  useEffect(() => {
    // Initialize Engine
    if (canvasRef.current && !engineRef.current) {
      engineRef.current = new GameEngine(canvasRef.current);
      engineRef.current.setKeyBindings(keyBindings);
      const initialDay = 1;
      engineRef.current.startDay(initialDay); // Load scenario for day 1
      engineRef.current.update(1, false); // Run one simulation step without advancing time to calculate initial metrics

      // Set initial UI state before game starts
      const initialStats = engineRef.current.getDashboardStats();
      setGameStatistics(initialStats);
      setCurrentBriefing(engineRef.current.getBriefingForDay(initialDay));
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
              setGameStatistics(newStats);

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
      
      return () => {
        cancelAnimationFrame(animationFrameId);
        engineRef.current?.destroy();
        engineRef.current = null;
      }
    }
  }, [keyBindings])

  useEffect(() => {
    if (engineRef.current && resolvedTheme) {
      engineRef.current.setTheme(resolvedTheme as 'light' | 'dark');
    }
  }, [resolvedTheme]);

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setAnimationsEnabled(animationsEnabled);
    }
  }, [animationsEnabled]);

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setRenderCanvasText(renderCanvasText);
    }
  }, [renderCanvasText]);

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setKeyBindings(keyBindings);
    }
  }, [keyBindings]);

  // This effect ensures that the initial view of the canvas is drawn correctly,
  // especially after a client-side navigation where layout calculations might be delayed.
  useEffect(() => {
    if (engineRef.current) {
      // Force a draw call to initialize the view if it hasn't been already.
      engineRef.current.draw(isPausedRef.current, isFastForwardRef.current);
    }
  }, [isDayTransition]); // Triggering on isDayTransition ensures this runs after initial setup.

  // Announce new critical alerts for screen readers
  useEffect(() => {
    if (alerts.length > 0) {
        const latestAlert = alerts[0];
        // Announce only new, critical alerts to avoid spamming the user
        if (latestAlert.id !== lastAnnouncedAlertId && latestAlert.critical) {
            setAnnouncement(`Alert: ${latestAlert.message}`);
            setLastAnnouncedAlertId(latestAlert.id);
        }
    }
  }, [alerts, lastAnnouncedAlertId]);

  // Centralized logic for pausing the game.
  // The game is paused if any modal is open, if we are between days,
  // if the day is over, or if the user explicitly paused it.
  useEffect(() => {
    const gameShouldBePaused =
      isAccessibilityOpen ||
      isQuitOpen ||
      isDayTransition ||
      isDayFinished ||
      isUserPaused ||
      isHelpOpen;
    setIsPaused(gameShouldBePaused);
  }, [isAccessibilityOpen, isQuitOpen, isDayTransition, isDayFinished, isUserPaused, isHelpOpen]);

  const showBriefingForDay = (dayToShow: number) => {
    setTargetDay(dayToShow);
    const briefing = engineRef.current?.getBriefingForDay(dayToShow);
    setCurrentBriefing(briefing || null);
    setIsDayTransition(true);
    setRightSidebarTab('brief');
  }

  const removeAlert = (id: number) => {
    setAlerts(prev => prev.filter(a => a.id !== id))
  }

  const removeHint = (id: number) => {
    setHints(prev => prev.filter(h => h.id !== id))
  }

  const handleDismissAllAlerts = () => {
    setAlerts([]);
  }

  const handleDismissAllHints = () => {
    setHints([]);
  }

  const togglePause = () => {
    const nextIsUserPaused = !isUserPaused;
    setIsUserPaused(nextIsUserPaused);

    // If the user is pausing the game, we should always turn off fast-forward
    // to ensure resuming starts at normal speed.
    if (nextIsUserPaused) {
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
      setIsDayTransition(false);
      setIsUserPaused(false); // Explicitly set user intent to "play" when the day starts.
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
    // In a static export, the link to the home page needs to point to index.html
    // to work correctly when opened via the file:// protocol.
    const homeUrl = isStaticExport ? './index.html' : '/';
    router.push(homeUrl);
  }

  const handleSubstationSelect = (sub: Substation) => {
    setSelectedSub(sub);
  }

  const handleBranchSelect = (branch: Branch) => {
    setSelectedBranch(branch);
  }

  return (
    <div className="flex flex-col min-h-screen lg:h-screen w-full lg:overflow-hidden">
      <AppHeader
        onAccessibilityClick={() => {
          setIsAccessibilityOpen(true);
        }}
        onHelpClick={() => {
          setIsHelpOpen(true);
        }}
        onQuitClick={() => {
          setIsQuitOpen(true);
        }}
      />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:flex lg:flex-row flex-1 lg:overflow-hidden">
          <Sidebar collapsible="none" className={cn("group w-full lg:w-96 border-r border-border bg-sidebar lg:!top-16 lg:!h-[calc(100vh-4rem)] h-auto overflow-visible", "order-2 md:order-1 lg:order-2")} aria-label="Energy Statistics">
            <SidebarContent className="font-share-tech flex flex-col overflow-y-auto p-4">
              {/* The EnergyStats component should now contain the generation mix details, replacing the historical plot. */}
              <EnergyStats stats={gameStatistics} />
            </SidebarContent>
          </Sidebar>
          <main className="order-1 md:order-3 md:col-span-2 lg:order-3 flex-1 flex flex-col relative min-w-0 min-h-[600px] lg:min-h-0 lg:overflow-hidden" aria-label="Main game area">
        <div className="game-wrapper relative flex-1 w-full min-h-[400px]">
          <canvas
            ref={canvasRef}
            tabIndex={0}
            aria-label="Interactive Texas electrical grid map"
            role="application"
            className={`h-full w-full outline-none focus-visible:ring-2 focus-visible:ring-primary ${viewMode !== 'visual' ? 'hidden' : ''}`}
          ></canvas>

          {viewMode === 'tabular' && (
            <div className="absolute inset-0 flex flex-row overflow-hidden bg-background text-foreground">
              <div className="flex-1 overflow-y-auto border-r p-4">
                <h2 className="text-xl font-bold mb-4 font-share-tech uppercase text-muted-foreground flex items-center gap-2">
                  <SubstationIcon className="h-5 w-5" />
                  Substations
                </h2>
                <SubstationsList 
                  subs={engineRef.current?.state.subs} 
                  onSubstationSelect={handleSubstationSelect} 
                />
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <h2 className="text-xl font-bold mb-4 font-share-tech uppercase text-muted-foreground flex items-center gap-2">
                  <LinesIcon className="h-7 w-7" />
                  Transmission Lines
                </h2>
                <BranchesList 
                  branches={engineRef.current?.state.branches} 
                  onBranchSelect={handleBranchSelect} 
                />
              </div>
            </div>
          )}

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

          {/* Modals */}
          <AccessibilityModal
            open={isAccessibilityOpen}
            onOpenChange={setIsAccessibilityOpen}
            viewMode={viewMode}
            onViewModeChange={(mode) => setViewMode(mode)}
            animationsEnabled={animationsEnabled}
            onAnimationsEnabledChange={setAnimationsEnabled}
            renderCanvasText={renderCanvasText}
            onRenderCanvasTextChange={setRenderCanvasText}
            keyBindings={keyBindings}
            onKeyBindingsChange={setKeyBindings}
          />
          {/* === NEW DYNAMIC MODALS === */}
          <SubstationModal 
            sub={selectedSub} 
            onClose={() => setSelectedSub(null)} 
            onUnitAction={handleUnitAction}
            onSetSetpoint={handleSetSetpoint}
            frWind={gameStatistics?.fr_wind}
            frSolar={gameStatistics?.fr_solar}
            isPaused={isPaused}
          />
          <BranchModal branch={selectedBranch} onClose={() => setSelectedBranch(null)} onCircuitAction={(branchId, circuit) => engineRef.current?.toggleBranchCircuitStatus(branchId, circuit)} isPaused={isPaused} />

          <QuitModal
            open={isQuitOpen}
            onOpenChange={(open) => {
              setIsQuitOpen(open);
              // Pause/resume is now handled by the central useEffect
            }}
            day={gameStatistics?.day || 1}
            onQuitToStart={handleQuitToStart}
            onReplayDay={handleReplayDay}
            onNextDay={handleNextDay}
          />
        </div>
        </main>
        <RightSidebar
          stats={gameStatistics}
          briefing={currentBriefing}
          alerts={alerts}
          onRemoveAlert={removeAlert}
          onDismissAllAlerts={handleDismissAllAlerts}
          hints={hints}
          onRemoveHint={removeHint}
          onDismissAllHints={handleDismissAllHints}
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
          progress={progress}
          isPaused={isPaused}
          isFastForward={isFastForward}
          onTogglePause={togglePause}
          onToggleFastForward={toggleFastForward}
          className="order-3 md:order-2 md:col-span-1 lg:order-1"
          aria-label="Game information, alerts, and hints"
        />
        </div>
      {/* Visually hidden container for screen reader announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
    </div>
  )
}

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <GamePageContent />
    </Suspense>
  )
}

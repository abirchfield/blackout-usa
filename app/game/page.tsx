"use client";

import { useState, useEffect, useRef, Suspense, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"
import { activeCase } from "@/data/cases"
import { Substation, Branch, Briefing, ResultDetails } from "@/lib/types"
import { useGameEngine } from "@/lib/hooks/use-game-engine"
import { useGameInput } from "@/lib/hooks/use-game-input"
import { AppHeader } from "@/components/header"
import { SidebarContent } from "@/components/ui/sidebar"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { GenerationDashboard, LoadDashboard, KeyStats, EnergyDashboard } from "@/components/energy-stats"
import { SubstationModal, SubstationDetailView } from "@/components/modals/substation-modal"
import { BranchModal, BranchDetailView } from "@/components/modals/branch-modal"
import { QuitModal } from "@/components/modals/quit-modal"
import { AccessibilityModal } from "@/components/modals/accessibility-modal"
import { SubstationsList } from "@/components/tables/substation-table"
import { BranchesList } from "@/components/tables/branch-table"
import { SubstationIcon } from "@/components/ui/substation-icon"
import { LinesIcon } from "@/components/ui/lines-icon"
import { HelpModal } from "@/components/modals/help-modal"
import { NotificationList } from "@/components/modals/notification-list"
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/components/ui/empty"
import { KeyBindings } from "@/lib/key-bindings"
import { DayResults } from "@/components/day-results"
import { DayTransitionModal } from "@/components/modals/day-transition-modal"
import { defaultAppSettings } from "@/lib/config"

const isStaticExport = process.env.NODE_ENV === 'production';

function GamePageContent() {
  // Modal States
  const [isQuitOpen, setIsQuitOpen] = useState(false)
  const [isAccessibilityOpen, setIsAccessibilityOpen] = useState(false)
  const [isAlertsModalOpen, setIsAlertsModalOpen] = useState(false)
  const [isHintsModalOpen, setIsHintsModalOpen] = useState(false)
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
  const [targetDay, setTargetDay] = useState(1);

  const [dayResultDetails, setDayResultDetails] = useState<ResultDetails | null>(null);

  const [viewMode, setViewMode] = useState<'visual' | 'tabular'>(defaultAppSettings.viewMode);
  const [animationsEnabled, setAnimationsEnabled] = useState(defaultAppSettings.animationsEnabled);
  const [renderCanvasText, setRenderCanvasText] = useState(defaultAppSettings.renderCanvasText);
  const [keyBindings, setKeyBindings] = useState<KeyBindings>(defaultAppSettings.keyBindings);
  const [showDetailsInSidebar, setShowDetailsInSidebar] = useState(defaultAppSettings.showDetailsInSidebar);
  const [zoomSensitivity, setZoomSensitivity] = useState(defaultAppSettings.zoomSensitivity);

  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg' | 'xl'>('base');
  const [dashboardTab, setDashboardTab] = useState<'briefing' | 'generation' | 'load' | 'energy'>('briefing');
  const [isMobile, setIsMobile] = useState(false);
  const [isHighContrast, setIsHighContrast] = useState(defaultAppSettings.isHighContrast);

  const lastFocusedElementRef = useRef<HTMLElement | null>(null);
  // Accessibility States
  const [announcement, setAnnouncement] = useState("");
  const [lastAnnouncedAlertId, setLastAnnouncedAlertId] = useState<number | null>(null);

  // Theme
  const { resolvedTheme } = useTheme()
  
  const togglePause = useCallback(() => {
    setIsUserPaused(prevIsUserPaused => {
      const nextIsUserPaused = !prevIsUserPaused;
      // If the user is pausing the game, we should always turn off fast-forward
      // to ensure resuming starts at normal speed.
      if (nextIsUserPaused) {
        setIsFastForward(false);
      }
      return nextIsUserPaused;
    });
  }, [setIsUserPaused, setIsFastForward]);

  const toggleFastForward = useCallback(() => {
    setIsFastForward(prevIsFastForward => {
      if (prevIsFastForward) {
        return false; // Go back to normal
      } else {
        setIsUserPaused(false); // Signal user's intent to play
        return true;
      }
    });
  }, [setIsFastForward, setIsUserPaused]);


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
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (isHighContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }
  }, [isHighContrast]);

  useEffect(() => {
    const root = document.documentElement;
    const sizeMap: Record<string, string> = {
      sm: '14px',
      base: '16px',
      lg: '18px',
      xl: '20px',
    };
    root.style.fontSize = sizeMap[fontSize] || '16px';
  }, [fontSize]);

  // Adjust dashboard tab when the sidebar layout changes
  useEffect(() => {
    if (!showDetailsInSidebar && (dashboardTab === 'generation' || dashboardTab === 'load')) {
      setDashboardTab('energy');
      setAnnouncement("Dashboard view changed to Grid Health.");
    } else if (showDetailsInSidebar && dashboardTab === 'energy') {
      // Default to 'generation' when expanding the view
      setDashboardTab('generation');
      setAnnouncement("Dashboard view changed to Generation.");
    }
  }, [showDetailsInSidebar, dashboardTab]);

  const openModal = (setter: (isOpen: boolean) => void) => {
    lastFocusedElementRef.current = document.activeElement as HTMLElement;
    setter(true);
  };

  const handleModalOpenChange = (setter: (isOpen: boolean) => void, open: boolean) => {
    setter(open);
    if (!open) {
      lastFocusedElementRef.current?.focus();
    }
  };

  const handleSubstationSelect = useCallback((sub: Substation) => {
    if (!selectedSub) { // Only save focus if we are opening a new view
      lastFocusedElementRef.current = document.activeElement as HTMLElement;
    }
    setSelectedSub(sub);
    setSelectedBranch(null);
    if (showDetailsInSidebar) {
      setAnnouncement(`Showing details for ${sub.Name} substation.`);
    } else {
      setAnnouncement(`Opened modal for ${sub.Name} substation.`);
    }
  }, [showDetailsInSidebar, selectedSub]);

  const handleBranchSelect = useCallback((branch: Branch) => {
    if (!selectedBranch) { // Only save focus if we are opening a new view
      lastFocusedElementRef.current = document.activeElement as HTMLElement;
    }
    setSelectedBranch(branch);
    setSelectedSub(null);
    if (showDetailsInSidebar) {
      setAnnouncement(`Showing details for line from ${branch.sub1?.Name} to ${branch.sub2?.Name}.`);
    } else {
      setAnnouncement(`Opened modal for line from ${branch.sub1?.Name} to ${branch.sub2?.Name}.`);
    }
  }, [showDetailsInSidebar, selectedBranch]);

  const handleDayComplete = useCallback((day: number, results: ResultDetails | null) => {
    setIsDayFinished(true);
    setDashboardTab('briefing');
    setDayResultDetails(results);
    setAnnouncement(`Day ${day} complete. Switched to Briefing tab.`);
  }, []);

  // --- Use Game Engine Hook ---
  const {
    canvasRef,
    engineRef,
    stats: gameStatistics,
    alerts,
    hints,
    setAlerts,
    setHints,
    dispatch,
    startDay,
    getBriefing
  } = useGameEngine({
    theme: resolvedTheme,
    keyBindings,
    animationsEnabled,
    renderCanvasText,
    zoomSensitivity,
    isPaused,
    isFastForward,
    onInteract: (type, data) => {
      if (type === 'sub') handleSubstationSelect(data as Substation);
      else if (type === 'branch') handleBranchSelect(data as Branch);
    },
    onDayComplete: handleDayComplete
  });

  const isBlackout = gameStatistics.blackout || false;

  // Initial Briefing Load
  useEffect(() => {
    if (gameStatistics.timeStep === 0 && gameStatistics.day === 1 && !currentBriefing) {
      setCurrentBriefing(getBriefing(1));
    }
  }, [gameStatistics.day, gameStatistics.timeStep, getBriefing, currentBriefing]);

  // Wire up keybinding controls that need engine access
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setOnTogglePause(togglePause);
      engineRef.current.setOnToggleFastForward(toggleFastForward);
    }
  }, [engineRef, togglePause, toggleFastForward]);

  // This effect ensures that the initial view of the canvas is drawn correctly,
  // especially after a client-side navigation where layout calculations might be delayed.
  useEffect(() => {
    if (engineRef.current) {
      // Force a draw call to initialize the view if it hasn't been already.
      engineRef.current.draw(isPaused, isFastForward);
    }
  }, [engineRef, isDayTransition, isPaused, isFastForward]); // Triggering on isDayTransition ensures this runs after initial setup.

  // --- Input Handling ---
  // We use a ref to track if input is blocked to avoid re-binding the event listener
  // every time a modal opens or closes.
  const isInputBlockedRef = useRef(false);
  useEffect(() => {
    isInputBlockedRef.current = 
      isAccessibilityOpen ||
      isQuitOpen ||
      isAlertsModalOpen ||
      isHintsModalOpen ||
      isHelpOpen ||
      (!showDetailsInSidebar && (!!selectedSub || !!selectedBranch));
  }, [isAccessibilityOpen, isQuitOpen, isAlertsModalOpen, isHintsModalOpen, isHelpOpen, showDetailsInSidebar, selectedSub, selectedBranch]);

  useGameInput({
    engineRef,
    keyBindings,
    isInputBlockedRef,
    selectedSub,
    selectedBranch,
    isBlackout
  });

  // Announce new alerts for screen readers
  useEffect(() => {
    if (alerts.length > 0) {
        const latestAlert = alerts[0];
        // Announce any new alert to avoid missing important information.
        if (latestAlert.id !== lastAnnouncedAlertId) {
            const prefix = latestAlert.critical ? "Critical Alert:" : "Alert:";
            setAnnouncement(`${prefix} ${latestAlert.message}`);
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
      isAlertsModalOpen ||
      isHintsModalOpen ||
      isDayTransition ||
      isDayFinished ||
      isUserPaused ||
      isHelpOpen;
    setIsPaused(gameShouldBePaused);
  }, [isAccessibilityOpen, isQuitOpen, isDayTransition, isDayFinished, isUserPaused, isHelpOpen, isAlertsModalOpen, isHintsModalOpen]);

  const showBriefingForDay = (dayToShow: number) => {
    setTargetDay(dayToShow);
    const briefing = getBriefing(dayToShow);
    setCurrentBriefing(briefing || null);
    setIsDayTransition(true);

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

  const handleStartDay = () => {
    if (isDayTransition) {
      startDay(targetDay);
      setIsDayTransition(false);
      setIsFastForward(false);
      setIsUserPaused(false); // Explicitly set user intent to "play" when the day starts.
      setDayResultDetails(null);
    }
  }

  const handleUnitAction = (subId: string, unitIndex: number) => {
    dispatch({ type: 'TOGGLE_UNIT', subId, unitIndex });
    setSelectedSub(engineRef.current?.state.subs[subId] || null); // Refresh modal data
  }

  const handleSetSetpoint = (subId: string, unitIndex: number, newSetpoint: number) => {
    dispatch({ type: 'SET_SETPOINT', subId, unitIndex, value: newSetpoint });
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
    const totalDays = Object.keys(activeCase.scenarios).length;
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

  const handleCloseDetails = () => {
    setSelectedSub(null);
    setSelectedBranch(null);
    lastFocusedElementRef.current?.focus();
  };

  const totalGeneration = gameStatistics.windGen + gameStatistics.solarGen + gameStatistics.thermalGen + gameStatistics.nuclearGen;

  // Define the panels as variables to reuse them in different layouts
  const SidebarPanel = (
    <ResizablePanel 
      defaultSize={isMobile ? 40 : 40} 
      minSize={25} 
      key="sidebar-panel"
      className={cn(isMobile ? "border-t-4 border-border" : "")}
      role="complementary"
      aria-label="Game Sidebar"
    >
          <div className={cn("group w-full h-full bg-sidebar")}>
            <ResizablePanelGroup direction="vertical" className="flex h-full">
              <ResizablePanel defaultSize={showDetailsInSidebar ? 50 : 100} minSize={25} className="!overflow-y-auto">
                <SidebarContent className="font-share-tech flex flex-col p-4 h-full">
                  <KeyStats
                    stats={gameStatistics}
                    totalGeneration={totalGeneration}
                    aria-label="Game information dashboard"
                  />
                  <Tabs value={dashboardTab} onValueChange={(value) => setDashboardTab(value as 'briefing' | 'generation' | 'load' | 'energy')} className="w-full flex-1 flex flex-col min-h-0">
                    <TabsList className={cn("grid w-full", !showDetailsInSidebar ? "grid-cols-2" : "grid-cols-3")}>
                      <TabsTrigger value="briefing" className="cursor-pointer">Briefing</TabsTrigger>
                      {!showDetailsInSidebar ? (
                        <TabsTrigger value="energy" className="cursor-pointer">Grid Health</TabsTrigger>
                      ) : (
                        <>
                          <TabsTrigger value="generation" className="cursor-pointer">Generation</TabsTrigger>
                          <TabsTrigger value="load" className="cursor-pointer">Load</TabsTrigger>
                        </>
                      )}
                    </TabsList>
                    <TabsContent value="briefing" className="mt-4 flex-1 flex flex-col min-h-0">
                      <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-4">
                        {isDayFinished && dayResultDetails ? (
                          <DayResults stats={gameStatistics} day={gameStatistics.day} resultDetails={dayResultDetails} />
                        ) : currentBriefing ? (
                          <div className="space-y-3">
                            <h4 className="font-bold leading-none">Day {targetDay} Briefing</h4>
                            <div className="bg-muted/20 p-3 rounded-lg border border-border text-sm">
                              {currentBriefing.isList ? (
                                <ul className="list-disc pl-4 space-y-1.5">{currentBriefing.points.map((point, index) => <li key={index}>{point}</li>)}</ul>
                              ) : (<p>{currentBriefing.points[0]}</p>)}
                            </div>
                          </div>
                        ) : ( !isDayTransition && <div className="p-4 text-center text-muted-foreground">Day {gameStatistics.day}</div> )}
                      </div>
                    </TabsContent>
                    {!showDetailsInSidebar ? (
                      <TabsContent value="energy" className="mt-4 flex-1 flex flex-col min-h-0">
                        <div className="flex-1 overflow-y-auto pr-2 -mr-2">
                          <EnergyDashboard stats={gameStatistics} />
                        </div>
                      </TabsContent>
                    ) : (
                      <>
                        <TabsContent value="generation" className="mt-4 flex-1 flex flex-col min-h-0">
                          <div className="flex-1 overflow-y-auto pr-2 -mr-2">
                            <GenerationDashboard stats={gameStatistics} />
                          </div>
                        </TabsContent>
                        <TabsContent value="load" className="mt-4 flex-1 flex flex-col min-h-0">
                          <div className="flex-1 overflow-y-auto pr-2 -mr-2">
                            <LoadDashboard stats={gameStatistics} />
                          </div>
                        </TabsContent>
                      </>
                    )}
                  </Tabs>
                </SidebarContent>
              </ResizablePanel>
              {showDetailsInSidebar && (
                <>
                  <ResizableHandle withHandle />
                  <ResizablePanel defaultSize={50} minSize={20}>
                    <SidebarContent className="font-share-tech flex flex-col p-4 h-full">
                      <div className="flex flex-col h-full">
                        {selectedSub ? (
                          <SubstationDetailView
                            sub={selectedSub}
                            onClose={handleCloseDetails}
                            onUnitAction={handleUnitAction}
                            onSetSetpoint={handleSetSetpoint}
                            frWind={gameStatistics?.fr_wind}
                            frSolar={gameStatistics?.fr_solar}
                            isPaused={isPaused}
                            isHighContrast={isHighContrast}
                          />
                        ) : selectedBranch ? (
                          <BranchDetailView
                            branch={selectedBranch}
                            onClose={handleCloseDetails}
                            onCircuitAction={(branchId, circuit) => dispatch({ type: 'TOGGLE_BRANCH', branchId, circuitNum: circuit })}
                            isPaused={isPaused}
                            isHighContrast={isHighContrast} // Assuming BranchDetailView will accept this
                          />
                        ) : (
                          <Empty className="py-12">
                            <EmptyMedia variant="default">
                              <div className="flex items-center justify-center gap-4 text-muted-foreground" aria-hidden="true">
                                <SubstationIcon className="size-12" />
                                <LinesIcon className="size-12" />
                              </div>
                            </EmptyMedia>
                            <EmptyHeader>
                              <EmptyTitle>Nothing Selected</EmptyTitle>
                              <EmptyDescription>Select an element on the map to see its details.</EmptyDescription>
                            </EmptyHeader>
                          </Empty>
                        )}
                      </div>
                    </SidebarContent>
                  </ResizablePanel>
                </>
              )}
            </ResizablePanelGroup>
          </div>
    </ResizablePanel>
  );

  const MainPanel = (
    <ResizablePanel defaultSize={isMobile ? 60 : 60} minSize={30} key="main-panel">
          <main className="h-full flex flex-col" aria-label="Main game area">
            <div className="font-share-tech relative flex-1 w-full h-full flex flex-col">
              {viewMode === 'visual' && (
                <div role="timer" aria-labelledby="vis-day-label vis-day-value vis-time-value" className="absolute top-4 left-4 z-10 pointer-events-none select-none bg-background/80 backdrop-blur-sm px-4 py-2 rounded-md border border-border/50 shadow-sm flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span id="vis-day-label" className="text-2xl font-semibold text-muted-foreground uppercase">Day</span>
                    <span id="vis-day-value" className="text-2xl font-semibold text-muted-foreground tabular-nums">{gameStatistics.day || 1}</span>
                  </div>
                  <time id="vis-time-value" dateTime={`D${gameStatistics.day}T${gameStatistics.timeStr.replace(/ /g, '')}`} className="text-2xl font-bold text-foreground tabular-nums tracking-wider">{gameStatistics.timeStr}</time>
                </div>
              )}
              <canvas
                ref={canvasRef}
                tabIndex={0}
                aria-label="Interactive Texas electrical grid map"
                role="application"
                className={`h-full w-full outline-none focus-visible:ring-2 focus-visible:ring-primary ${viewMode !== 'visual' ? 'hidden' : ''}`}
              ></canvas>
              {viewMode === 'tabular' && (
                <div className="absolute inset-0 flex flex-col md:flex-row overflow-hidden bg-background text-foreground font-share-tech">
                  <div className="flex-1 border-b md:border-b-0 md:border-r p-4 flex flex-col min-h-0">
                    <div className="flex justify-between items-baseline mb-4">
                      <h2 className="text-xl font-bold uppercase text-muted-foreground flex items-center gap-2"><SubstationIcon className="h-5 w-5" aria-hidden="true" />Substations</h2>
                      <div className="flex items-center gap-4" role="timer" aria-labelledby="tab-day-label tab-day-value tab-time-value">
                        <div className="flex items-center gap-2">
                          <span id="tab-day-label" className="text-lg font-semibold text-muted-foreground uppercase">Day</span>
                          <span id="tab-day-value" className="text-lg font-semibold text-muted-foreground tabular-nums">{gameStatistics.day || 1}</span>
                        </div>
                        <time id="tab-time-value" dateTime={`D${gameStatistics.day}T${gameStatistics.timeStr.replace(/ /g, '')}`} className="text-lg font-bold text-foreground tabular-nums tracking-wider">{gameStatistics.timeStr}</time>
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto -mr-4 pr-4">
                      <SubstationsList subs={engineRef.current?.state?.subs || {}} onSubstationSelect={handleSubstationSelect} />
                    </div>
                  </div>
                  <div className="flex-1 p-4 flex flex-col min-h-0">
                    <h2 className="text-xl font-bold mb-4 uppercase text-muted-foreground flex items-center gap-2"><LinesIcon className="h-7 w-7" aria-hidden="true" />Transmission Lines</h2>
                    <div className="flex-1 overflow-y-auto -mr-4 pr-4">
                      <BranchesList branches={engineRef.current?.state?.branches || {}} onBranchSelect={handleBranchSelect} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </main>
    </ResizablePanel>
  );

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-background">
      <AppHeader
        onAccessibilityClick={() => openModal(setIsAccessibilityOpen)}
        onHelpClick={() => openModal(setIsHelpOpen)}
        onQuitClick={() => openModal(setIsQuitOpen)}
        isPaused={isPaused}
        isFastForward={isFastForward}
        onTogglePause={togglePause}
        onToggleFastForward={toggleFastForward}
        onAlertsClick={() => openModal(setIsAlertsModalOpen)}
        onHintsClick={() => openModal(setIsHintsModalOpen)}
        alertsCount={alerts.length}
        hintsCount={hints.length}
        controlsDisabled={isDayTransition}
        isBlackout={isBlackout}
        isHighContrast={isHighContrast}
      />
      {/* Responsive Resizable Layout with Max Width Constraint */}
      <div className="flex-1 w-full max-w-[1920px] mx-auto border-x border-border flex flex-col overflow-hidden">
      <ResizablePanelGroup direction={isMobile ? "vertical" : "horizontal"} className="flex flex-1 w-full h-full">
        {isMobile ? (
          <>
            {MainPanel}
            <ResizableHandle withHandle />
            {SidebarPanel}
          </>
        ) : (
          <>
            {SidebarPanel}
            <ResizableHandle withHandle />
            {MainPanel}
          </>
        )}
      </ResizablePanelGroup>
      </div>

      {/* Modals are now outside the layout flow to avoid duplication */}
      <HelpModal
        open={isHelpOpen}
        onOpenChange={(open: boolean) => {
          handleModalOpenChange(setIsHelpOpen, open);
          if (!open && isInitialTutorial) { // After tutorial, show briefing
            setIsDayTransition(true);
            setIsInitialTutorial(false);
          }
        }}
      />
      <AccessibilityModal
        open={isAccessibilityOpen}
        onOpenChange={(open) => handleModalOpenChange(setIsAccessibilityOpen, open)}
        viewMode={viewMode}
        onViewModeChange={(mode) => {
          setViewMode(mode);
          setAnnouncement(`Display mode changed to ${mode}.`);
        }}
        animationsEnabled={animationsEnabled}
        onAnimationsEnabledChange={setAnimationsEnabled}
        renderCanvasText={renderCanvasText}
        onRenderCanvasTextChange={setRenderCanvasText}
        keyBindings={keyBindings}
        onKeyBindingsChange={setKeyBindings}
        showDetailsInSidebar={showDetailsInSidebar}
        onShowDetailsInSidebarChange={setShowDetailsInSidebar}
        zoomSensitivity={zoomSensitivity}
        onZoomSensitivityChange={setZoomSensitivity}
        fontSize={fontSize}
        onFontSizeChange={setFontSize}
        isHighContrast={isHighContrast}
        onIsHighContrastChange={setIsHighContrast}
      />
      {!showDetailsInSidebar && (
        <>
          <SubstationModal
            sub={selectedSub}
            onClose={handleCloseDetails}
            onUnitAction={handleUnitAction}
            onSetSetpoint={handleSetSetpoint}
            frWind={gameStatistics?.fr_wind}
            frSolar={gameStatistics?.fr_solar}
            isPaused={isPaused}
            isHighContrast={isHighContrast}
          />
          <BranchModal 
            branch={selectedBranch} 
            onClose={handleCloseDetails} 
            onCircuitAction={(branchId, circuit) => dispatch({ type: 'TOGGLE_BRANCH', branchId, circuitNum: circuit })} 
            isPaused={isPaused} 
            isHighContrast={isHighContrast}
          />
        </>
      )}
      <QuitModal
        open={isQuitOpen}
        onOpenChange={(open) => handleModalOpenChange(setIsQuitOpen, open)}
        day={gameStatistics?.day || 1}
        onQuitToStart={handleQuitToStart}
        onReplayDay={handleReplayDay}
        onNextDay={handleNextDay}
        isHighContrast={isHighContrast}
      />
      <DayTransitionModal
        isDayTransition={isDayTransition}
        isDayFinished={isDayFinished}
        targetDay={targetDay}
        currentBriefing={currentBriefing}
        dayResultDetails={dayResultDetails}
        gameStatistics={gameStatistics}
        isHighContrast={isHighContrast}
        onStartDay={handleStartDay}
        onReplayDay={handleReplayDay}
        onNextDay={handleNextDay}
      />
      <Dialog open={isAlertsModalOpen} onOpenChange={(open) => handleModalOpenChange(setIsAlertsModalOpen, open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alerts</DialogTitle>
            <DialogDescription>
              Critical and informational messages about the grid status.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto -mx-6 px-6">
            <NotificationList items={alerts} onRemove={removeAlert} onDismissAll={handleDismissAllAlerts} emptyMessage="No alerts to show" ariaLabel="List of alerts" />
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={isHintsModalOpen} onOpenChange={(open) => handleModalOpenChange(setIsHintsModalOpen, open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hints</DialogTitle>
            <DialogDescription>
              Suggestions and guidance for managing the grid.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto -mx-6 px-6">
            <NotificationList items={hints} onRemove={removeHint} onDismissAll={handleDismissAllHints} emptyMessage="No hints to show" ariaLabel="List of hints" />
          </div>
        </DialogContent>
      </Dialog>

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

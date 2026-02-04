"use client";

import { useState, useEffect, useRef, Suspense, useCallback, useMemo } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"
import { activeCase } from "@/data/cases"
import { Substation, Branch, Briefing, ResultDetails } from "@/lib/types"
import { useGameEngine } from "@/lib/hooks/use-game-engine"
import { useGameInput } from "@/lib/hooks/use-game-input"
import { AppHeader } from "@/components/header"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog"
import { KeyStats, EnergyDashboard } from "@/components/energy-stats"
import { SubstationModal } from "@/components/modals/substation-modal"
import { BranchModal } from "@/components/modals/branch-modal"
import { QuitModal } from "@/components/modals/quit-modal"
import { AccessibilityModal } from "@/components/modals/accessibility-modal"
import { SubstationsList } from "@/components/tables/substation-table"
import { BranchesList } from "@/components/tables/branch-table"
import { SubstationIcon } from "@/components/ui/substation-icon"
import { LinesIcon } from "@/components/ui/lines-icon"
import { HelpModal } from "@/components/modals/help-modal"
import { NotificationList } from "@/components/modals/notification-list"
import { KeyBindings } from "@/lib/key-bindings"
import { DayTransitionModal } from "@/components/modals/day-transition-modal"
import { ErrorBoundary } from "@/components/error-boundary"
import { defaultAppSettings, FONT_SIZE_MAP } from "@/lib/config"

const isStaticExport = process.env.NODE_ENV === 'production';

function DayTimeDisplay({ day, timeStr, idPrefix, size }: {
  day: number; timeStr: string; idPrefix: string; size: 'sm' | 'lg';
}) {
  const textClass = size === 'lg' ? 'text-2xl sm:text-3xl' : 'text-lg';
  return (
    <div className="flex items-center gap-4" role="timer" aria-labelledby={`${idPrefix}-day-label ${idPrefix}-day-value ${idPrefix}-time-value`}>
      <div className="flex items-center gap-2">
        <span id={`${idPrefix}-day-label`} className={`${textClass} font-semibold text-muted-foreground uppercase`}>Day</span>
        <span id={`${idPrefix}-day-value`} className={`${textClass} font-semibold text-muted-foreground tabular-nums`}>{day || 1}</span>
      </div>
      <time id={`${idPrefix}-time-value`} dateTime={`D${day}T${timeStr.replace(/ /g, '')}`} className={`${textClass} font-bold text-foreground tabular-nums tracking-wider`}>{timeStr}</time>
    </div>
  );
}

function NotificationDialog({ open, onOpenChange, title, description, items, onRemove, onDismissAll, emptyMessage, ariaLabel }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  items: Array<{id: number; time: string; message: string; critical?: boolean}>;
  onRemove: (id: number) => void;
  onDismissAll: () => void;
  emptyMessage: string;
  ariaLabel: string;
}) {
  if (!open) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto -mx-6 px-6">
          <NotificationList items={items} onRemove={onRemove} onDismissAll={onDismissAll} emptyMessage={emptyMessage} ariaLabel={ariaLabel} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

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
  const [isUserPaused, setIsUserPaused] = useState(true)
  const [isDayFinished, setIsDayFinished] = useState(false)
  const [isFastForward, setIsFastForward] = useState(false)
  const [targetDay, setTargetDay] = useState(1);

  const [dayResultDetails, setDayResultDetails] = useState<ResultDetails | null>(null);

  const [viewMode, setViewMode] = useState<'map' | 'tabular'>(defaultAppSettings.viewMode);
  const [animationsEnabled, setAnimationsEnabled] = useState(defaultAppSettings.animationsEnabled);
  const [renderMapLabels, setRenderMapLabels] = useState(defaultAppSettings.renderMapLabels);
  const [keyBindings, setKeyBindings] = useState<KeyBindings>(defaultAppSettings.keyBindings);
  const [zoomSensitivity, setZoomSensitivity] = useState(defaultAppSettings.zoomSensitivity);

  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg' | 'xl'>('base');
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
      if (nextIsUserPaused) {
        setIsFastForward(false);
      }
      return nextIsUserPaused;
    });
  }, [setIsUserPaused, setIsFastForward]);

  const toggleFastForward = useCallback(() => {
    setIsFastForward(prevIsFastForward => {
      if (prevIsFastForward) {
        return false;
      } else {
        setIsUserPaused(false);
        return true;
      }
    });
  }, [setIsFastForward, setIsUserPaused]);

  const searchParams = useSearchParams();
  const router = useRouter();
  const showTutorial = searchParams.get('tutorial') === 'true';
  const [isDayTransition, setIsDayTransition] = useState(!showTutorial);

  // Derive isPaused from all blocking conditions
  const isPaused = isAccessibilityOpen || isQuitOpen || isAlertsModalOpen ||
    isHintsModalOpen || isDayTransition || isDayFinished || isUserPaused || isHelpOpen;

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
    root.style.fontSize = FONT_SIZE_MAP[fontSize] || '16px';
  }, [fontSize]);

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
    if (!selectedSub) {
      lastFocusedElementRef.current = document.activeElement as HTMLElement;
    }
    setSelectedSub(sub);
    setSelectedBranch(null);
    setAnnouncement(`Opened modal for ${sub.Name} substation.`);
  }, [selectedSub]);

  const handleBranchSelect = useCallback((branch: Branch) => {
    if (!selectedBranch) {
      lastFocusedElementRef.current = document.activeElement as HTMLElement;
    }
    setSelectedBranch(branch);
    setSelectedSub(null);
    setAnnouncement(`Opened modal for line from ${branch.sub1?.Name} to ${branch.sub2?.Name}.`);
  }, [selectedBranch]);

  const handleDayComplete = useCallback((day: number, results: ResultDetails | null) => {
    setIsDayFinished(true);
    setDayResultDetails(results);
    setAnnouncement(`Day ${day} complete.`);
  }, []);

  const handleInteract = useCallback((type: 'sub' | 'branch', data: Substation | Branch) => {
    if (type === 'sub') handleSubstationSelect(data as Substation);
    else if (type === 'branch') handleBranchSelect(data as Branch);
  }, [handleSubstationSelect, handleBranchSelect]);

  // --- Use Game Engine Hook ---
  const {
    svgContainerRef,
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
    renderMapLabels,
    zoomSensitivity,
    isPaused,
    isFastForward,
    onInteract: handleInteract,
    onDayComplete: handleDayComplete,
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
      engineRef.current.draw(isPaused, isFastForward);
    }
  }, [engineRef, isDayTransition, isPaused, isFastForward]);

  // --- Input Handling ---
  const isInputBlockedRef = useRef(false);
  useEffect(() => {
    isInputBlockedRef.current =
      isAccessibilityOpen ||
      isQuitOpen ||
      isAlertsModalOpen ||
      isHintsModalOpen ||
      isHelpOpen ||
      !!selectedSub || !!selectedBranch;
  }, [isAccessibilityOpen, isQuitOpen, isAlertsModalOpen, isHintsModalOpen, isHelpOpen, selectedSub, selectedBranch]);

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
        if (latestAlert.id !== lastAnnouncedAlertId) {
            const prefix = latestAlert.critical ? "Critical Alert:" : "Alert:";
            setAnnouncement(`${prefix} ${latestAlert.message}`);
            setLastAnnouncedAlertId(latestAlert.id);
        }
    }
  }, [alerts, lastAnnouncedAlertId]);

  const showBriefingForDay = (dayToShow: number) => {
    setTargetDay(dayToShow);
    const briefing = getBriefing(dayToShow);
    setCurrentBriefing(briefing || null);
    setIsDayTransition(true);
  }

  const navigateToDay = (day: number) => {
    showBriefingForDay(day);
    setIsDayFinished(false);
    setDayResultDetails(null);
    setIsQuitOpen(false);
  }

  const handleStartDay = () => {
    if (isDayTransition) {
      startDay(targetDay);
      setIsDayTransition(false);
      setIsFastForward(false);
      setIsUserPaused(false);
      setDayResultDetails(null);
      setAlerts([]);
      setHints([]);
    }
  }

  const handleUnitAction = (subId: string, unitIndex: number) => {
    dispatch({ type: 'TOGGLE_UNIT', subId, unitIndex });
    setSelectedSub(engineRef.current?.state.subs[subId] || null);
  }

  const handleSetSetpoint = (subId: string, unitIndex: number, newSetpoint: number) => {
    dispatch({ type: 'SET_SETPOINT', subId, unitIndex, value: newSetpoint });
    setSelectedSub(engineRef.current?.state.subs[subId] || null);
  }

  const handleReplayDay = (currentDay: number) => navigateToDay(currentDay);

  const handleNextDay = (currentDay: number) => {
    const totalDays = Object.keys(activeCase.scenarios).length;
    const nextDay = currentDay < totalDays ? currentDay + 1 : 1;
    navigateToDay(nextDay);
  }

  const handleQuitToStart = () => {
    const homeUrl = isStaticExport ? './index.html' : '/';
    router.push(homeUrl);
  }

  const handleCloseDetails = () => {
    setSelectedSub(null);
    setSelectedBranch(null);
    lastFocusedElementRef.current?.focus();
  };

  const totalGeneration = useMemo(
    () => gameStatistics.windGen + gameStatistics.solarGen + gameStatistics.thermalGen + gameStatistics.nuclearGen,
    [gameStatistics.windGen, gameStatistics.solarGen, gameStatistics.thermalGen, gameStatistics.nuclearGen]
  );

  const SidebarPanel = (
    <aside
      className={cn("bg-sidebar overflow-y-auto", isMobile ? "border-t-4 border-border" : "w-[400px] flex-shrink-0 border-r border-border")}
      role="complementary"
      aria-label="Game Sidebar"
    >
      <div className="font-share-tech flex flex-col p-4 h-full">
        <KeyStats
          stats={gameStatistics}
          totalGeneration={totalGeneration}
          aria-label="Game information dashboard"
        />
        <div className="flex-1 flex flex-col min-h-0 mt-4">
          <div className="flex-1 overflow-y-auto pr-2 -mr-2">
            <EnergyDashboard stats={gameStatistics} />
          </div>
        </div>
      </div>
    </aside>
  );

  const MainPanel = (
    <main className="flex-1 min-w-0 h-full flex flex-col" aria-label="Main game area">
      <div className="font-share-tech relative flex-1 w-full h-full flex flex-col">
        {viewMode !== 'tabular' && (
          <div className="absolute top-4 left-4 z-10 pointer-events-none select-none bg-background/80 backdrop-blur-sm px-5 py-2.5 rounded-md border border-border/50 shadow-sm">
            <DayTimeDisplay day={gameStatistics.day} timeStr={gameStatistics.timeStr} idPrefix="vis" size="lg" />
          </div>
        )}
        <div
          ref={svgContainerRef}
          tabIndex={0}
          aria-label="Interactive Texas electrical grid map"
          role="application"
          className={`h-full w-full outline-none focus-visible:ring-2 focus-visible:ring-primary ${viewMode !== 'map' ? 'hidden' : ''}`}
        ></div>
        {viewMode === 'tabular' && (
          <div className="absolute inset-0 flex flex-col md:flex-row overflow-hidden bg-background text-foreground font-share-tech">
            <div className="flex-1 border-b md:border-b-0 md:border-r p-4 flex flex-col min-h-0">
              <div className="flex justify-between items-baseline mb-4">
                <h2 className="text-xl font-bold uppercase text-muted-foreground flex items-center gap-2"><SubstationIcon className="h-5 w-5" aria-hidden="true" />Substations</h2>
                <DayTimeDisplay day={gameStatistics.day} timeStr={gameStatistics.timeStr} idPrefix="tab" size="sm" />
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
  );

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-background select-none">
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
        onBriefingClick={() => { setIsDayTransition(true); }}
        alertsCount={alerts.length}
        hintsCount={hints.length}
        controlsDisabled={isDayTransition}
        isBlackout={isBlackout}
        isHighContrast={isHighContrast}
      />
      {/* Layout */}
      <div className={cn("flex-1 w-full max-w-[1920px] mx-auto border-x border-border flex overflow-hidden", isMobile ? "flex-col" : "flex-row")}>
        {isMobile ? (
          <>
            {MainPanel}
            {SidebarPanel}
          </>
        ) : (
          <>
            {SidebarPanel}
            {MainPanel}
          </>
        )}
      </div>

      {/* Modals */}
      <HelpModal
        open={isHelpOpen}
        onOpenChange={(open: boolean) => {
          handleModalOpenChange(setIsHelpOpen, open);
          if (!open && isInitialTutorial) {
            setIsDayTransition(true);
            setIsInitialTutorial(false);
          }
        }}
      />
      {isAccessibilityOpen && (
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
          renderMapLabels={renderMapLabels}
          onRenderMapLabelsChange={setRenderMapLabels}
          keyBindings={keyBindings}
          onKeyBindingsChange={setKeyBindings}
          zoomSensitivity={zoomSensitivity}
          onZoomSensitivityChange={setZoomSensitivity}
          fontSize={fontSize}
          onFontSizeChange={setFontSize}
          isHighContrast={isHighContrast}
          onIsHighContrastChange={setIsHighContrast}
        />
      )}
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
      {isQuitOpen && (
        <QuitModal
          open={isQuitOpen}
          onOpenChange={(open) => handleModalOpenChange(setIsQuitOpen, open)}
          day={gameStatistics?.day || 1}
          onQuitToStart={handleQuitToStart}
          onReplayDay={handleReplayDay}
          onNextDay={handleNextDay}
          isHighContrast={isHighContrast}
        />
      )}
      <DayTransitionModal
        isDayTransition={isDayTransition}
        isDayFinished={isDayFinished}
        targetDay={targetDay}
        currentBriefing={currentBriefing}
        dayResultDetails={dayResultDetails}
        gameStatistics={gameStatistics}
        isHighContrast={isHighContrast}
        onStartDay={handleStartDay}
        onClose={() => setIsDayTransition(false)}
        onReplayDay={handleReplayDay}
        onNextDay={handleNextDay}
      />
      <NotificationDialog
        open={isAlertsModalOpen}
        onOpenChange={(open) => handleModalOpenChange(setIsAlertsModalOpen, open)}
        title="Alerts"
        description="Critical and informational messages about the grid status."
        items={alerts}
        onRemove={(id) => setAlerts(prev => prev.filter(a => a.id !== id))}
        onDismissAll={() => setAlerts([])}
        emptyMessage="No alerts to show"
        ariaLabel="List of alerts"
      />
      <NotificationDialog
        open={isHintsModalOpen}
        onOpenChange={(open) => handleModalOpenChange(setIsHintsModalOpen, open)}
        title="Hints"
        description="Suggestions and guidance for managing the grid."
        items={hints}
        onRemove={(id) => setHints(prev => prev.filter(h => h.id !== id))}
        onDismissAll={() => setHints([])}
        emptyMessage="No hints to show"
        ariaLabel="List of hints"
      />

      {/* Visually hidden container for screen reader announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
    </div>
  )
}

export default function Page() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<div>Loading...</div>}>
        <GamePageContent />
      </Suspense>
    </ErrorBoundary>
  )
}

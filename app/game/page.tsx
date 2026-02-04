"use client";

import { useState, useEffect, useRef, Suspense, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"
import { activeCase } from "@/data/cases"
import { Substation, Branch, ResultDetails, DayFlowState } from "@/lib/types"
import { useGameEngine } from "@/lib/hooks/use-game-engine"
import { useGameInput } from "@/lib/hooks/use-game-input"
import { useAppSettings } from "@/lib/hooks/use-app-settings"
import { useModalManager } from "@/lib/hooks/use-modal-manager"
import { AppHeader } from "@/components/header"
import { KeyStats, EnergyDashboard } from "@/components/energy-stats"
import { DayTimeDisplay } from "@/components/day-time-display"
import { SubstationModal } from "@/components/modals/substation-modal"
import { BranchModal } from "@/components/modals/branch-modal"
import { QuitModal } from "@/components/modals/quit-modal"
import { AccessibilityModal } from "@/components/modals/accessibility-modal"
import { NotificationDialog } from "@/components/modals/notification-dialog"
import { SubstationsList } from "@/components/tables/substation-table"
import { BranchesList } from "@/components/tables/branch-table"
import { SubstationIcon } from "@/components/ui/substation-icon"
import { LinesIcon } from "@/components/ui/lines-icon"
import { HelpModal } from "@/components/modals/help-modal"
import { DayTransitionModal } from "@/components/modals/day-transition-modal"
import { ErrorBoundary } from "@/components/error-boundary"

const isStaticExport = process.env.NODE_ENV === 'production';

function GamePageContent() {
  // --- App Settings (view, accessibility, keybindings) ---
  const { settings, updateSettings } = useAppSettings();

  // --- Modal Management ---
  const modals = useModalManager();

  // --- Data-driven modals (sub/branch detail panels) ---
  const [selectedSub, setSelectedSub] = useState<Substation | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const detailsFocusRef = useRef<HTMLElement | null>(null);

  // --- Day Flow State ---
  const searchParams = useSearchParams();
  const router = useRouter();
  const showTutorial = searchParams.get('tutorial') === 'true';
  const [isInitialTutorial, setIsInitialTutorial] = useState(false);

  const [dayFlow, setDayFlow] = useState<DayFlowState>({
    targetDay: 1,
    isDayFinished: false,
    resultDetails: null,
    briefing: null,
    isTransitioning: !showTutorial,
  });

  // --- Playback State ---
  const [isUserPaused, setIsUserPaused] = useState(true);
  const [isFastForward, setIsFastForward] = useState(false);

  // --- UI State ---
  const [isMobile, setIsMobile] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [lastAnnouncedAlertId, setLastAnnouncedAlertId] = useState<number | null>(null);

  // --- Theme ---
  const { resolvedTheme } = useTheme();

  // --- Derived State ---
  const isPaused = modals.isAnyModalOpen || dayFlow.isTransitioning || dayFlow.isDayFinished || isUserPaused;

  // --- Playback Controls ---
  const togglePause = useCallback(() => {
    setIsUserPaused(prev => {
      const next = !prev;
      if (next) setIsFastForward(false);
      return next;
    });
  }, []);

  const toggleFastForward = useCallback(() => {
    setIsFastForward(prev => {
      if (prev) return false;
      setIsUserPaused(false);
      return true;
    });
  }, []);

  // --- Tutorial init ---
  const { openModal } = modals;
  useEffect(() => {
    if (showTutorial) {
      openModal('help');
      setIsInitialTutorial(true);
    }
  }, [showTutorial, openModal]);

  // --- Mobile detection ---
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // --- Interaction Handlers ---
  const handleSubstationSelect = useCallback((sub: Substation) => {
    if (!selectedSub) {
      detailsFocusRef.current = document.activeElement as HTMLElement;
    }
    setSelectedSub(sub);
    setSelectedBranch(null);
    setAnnouncement(`Opened modal for ${sub.Name} substation.`);
  }, [selectedSub]);

  const handleBranchSelect = useCallback((branch: Branch) => {
    if (!selectedBranch) {
      detailsFocusRef.current = document.activeElement as HTMLElement;
    }
    setSelectedBranch(branch);
    setSelectedSub(null);
    setAnnouncement(`Opened modal for line from ${branch.sub1?.Name} to ${branch.sub2?.Name}.`);
  }, [selectedBranch]);

  const handleDayComplete = useCallback((day: number, results: ResultDetails | null) => {
    setDayFlow(prev => ({ ...prev, isDayFinished: true, resultDetails: results }));
    setAnnouncement(`Day ${day} complete.`);
  }, []);

  const handleInteract = useCallback((type: 'sub' | 'branch', data: Substation | Branch) => {
    if (type === 'sub') handleSubstationSelect(data as Substation);
    else if (type === 'branch') handleBranchSelect(data as Branch);
  }, [handleSubstationSelect, handleBranchSelect]);

  // --- Game Engine ---
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
    keyBindings: settings.keyBindings,
    animationsEnabled: settings.animationsEnabled,
    renderMapLabels: settings.renderMapLabels,
    zoomSensitivity: settings.zoomSensitivity,
    isPaused,
    isFastForward,
    onInteract: handleInteract,
    onDayComplete: handleDayComplete,
  });

  const isBlackout = gameStatistics.blackout || false;

  // --- Initial Briefing Load ---
  useEffect(() => {
    if (gameStatistics.timeStep === 0 && gameStatistics.day === 1 && !dayFlow.briefing) {
      setDayFlow(prev => ({ ...prev, briefing: getBriefing(1) }));
    }
  }, [gameStatistics.day, gameStatistics.timeStep, getBriefing, dayFlow.briefing]);

  // --- Wire engine keybinding controls ---
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setOnTogglePause(togglePause);
      engineRef.current.setOnToggleFastForward(toggleFastForward);
    }
  }, [engineRef, togglePause, toggleFastForward]);

  // --- Ensure initial canvas draw ---
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.draw(isPaused, isFastForward);
    }
  }, [engineRef, dayFlow.isTransitioning, isPaused, isFastForward]);

  // --- Input Handling ---
  const isInputBlockedRef = useRef(false);
  useEffect(() => {
    isInputBlockedRef.current = modals.isAnyModalOpen || !!selectedSub || !!selectedBranch;
  }, [modals.isAnyModalOpen, selectedSub, selectedBranch]);

  useGameInput({
    engineRef,
    keyBindings: settings.keyBindings,
    isInputBlockedRef,
    selectedSub,
    selectedBranch,
    isBlackout
  });

  // --- Screen reader alert announcements ---
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

  // --- Day Navigation ---
  const navigateToDay = useCallback((day: number) => {
    const briefing = getBriefing(day);
    setDayFlow({
      targetDay: day,
      isDayFinished: false,
      resultDetails: null,
      briefing: briefing || null,
      isTransitioning: true,
    });
    modals.closeModal();
  }, [getBriefing, modals]);

  const handleStartDay = () => {
    if (!dayFlow.isTransitioning) return;
    startDay(dayFlow.targetDay);
    setDayFlow(prev => ({ ...prev, isTransitioning: false, resultDetails: null }));
    setIsFastForward(false);
    setIsUserPaused(false);
    setAlerts([]);
    setHints([]);
  };

  const handleUnitAction = (subId: string, unitIndex: number) => {
    dispatch({ type: 'TOGGLE_UNIT', subId, unitIndex });
    setSelectedSub(engineRef.current?.state.subs[subId] || null);
  };

  const handleSetSetpoint = (subId: string, unitIndex: number, newSetpoint: number) => {
    dispatch({ type: 'SET_SETPOINT', subId, unitIndex, value: newSetpoint });
    setSelectedSub(engineRef.current?.state.subs[subId] || null);
  };

  const handleNextDay = useCallback((currentDay: number) => {
    const totalDays = Object.keys(activeCase.scenarios).length;
    navigateToDay(currentDay < totalDays ? currentDay + 1 : 1);
  }, [navigateToDay]);

  const handleQuitToStart = () => {
    router.push(isStaticExport ? './index.html' : '/');
  };

  const handleCloseDetails = () => {
    setSelectedSub(null);
    setSelectedBranch(null);
    detailsFocusRef.current?.focus();
  };

  // --- Layout Panels ---
  const SidebarPanel = (
    <aside
      className={cn("bg-sidebar overflow-y-auto", isMobile ? "border-t-4 border-border" : "w-[400px] flex-shrink-0 border-r border-border")}
      role="complementary"
      aria-label="Game Sidebar"
    >
      <div className="font-share-tech flex flex-col p-4 h-full">
        <KeyStats stats={gameStatistics} aria-label="Game information dashboard" />
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
        {settings.viewMode !== 'tabular' && (
          <div className="absolute top-4 left-4 z-10 pointer-events-none select-none bg-background/80 backdrop-blur-sm px-5 py-2.5 rounded-md border border-border/50 shadow-sm">
            <DayTimeDisplay day={gameStatistics.day} timeStr={gameStatistics.timeStr} idPrefix="vis" size="lg" />
          </div>
        )}
        <div
          ref={svgContainerRef}
          tabIndex={0}
          aria-label="Interactive Texas electrical grid map"
          role="application"
          className={`h-full w-full outline-none focus-visible:ring-2 focus-visible:ring-primary ${settings.viewMode !== 'map' ? 'hidden' : ''}`}
        ></div>
        {settings.viewMode === 'tabular' && (
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
        onAccessibilityClick={() => modals.openModal('accessibility')}
        onHelpClick={() => modals.openModal('help')}
        onQuitClick={() => modals.openModal('quit')}
        isPaused={isPaused}
        isFastForward={isFastForward}
        onTogglePause={togglePause}
        onToggleFastForward={toggleFastForward}
        onAlertsClick={() => modals.openModal('alerts')}
        onHintsClick={() => modals.openModal('hints')}
        onBriefingClick={() => setDayFlow(prev => ({ ...prev, isTransitioning: true }))}
        alertsCount={alerts.length}
        hintsCount={hints.length}
        controlsDisabled={dayFlow.isTransitioning}
        isBlackout={isBlackout}
        isHighContrast={settings.isHighContrast}
      />
      {/* Layout */}
      <div className={cn("flex-1 w-full max-w-[1920px] mx-auto border-x border-border flex overflow-hidden", isMobile ? "flex-col" : "flex-row")}>
        {isMobile ? <>{MainPanel}{SidebarPanel}</> : <>{SidebarPanel}{MainPanel}</>}
      </div>

      {/* Modals */}
      <HelpModal
        open={modals.isOpen('help')}
        onOpenChange={(open: boolean) => {
          modals.onOpenChange('help', open);
          if (!open && isInitialTutorial) {
            setDayFlow(prev => ({ ...prev, isTransitioning: true }));
            setIsInitialTutorial(false);
          }
        }}
      />
      {modals.isOpen('accessibility') && (
        <AccessibilityModal
          open={true}
          onOpenChange={(open) => modals.onOpenChange('accessibility', open)}
          settings={settings}
          onSettingsChange={updateSettings}
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
        isHighContrast={settings.isHighContrast}
      />
      <BranchModal
        branch={selectedBranch}
        onClose={handleCloseDetails}
        onCircuitAction={(branchId, circuit) => dispatch({ type: 'TOGGLE_BRANCH', branchId, circuitNum: circuit })}
        isPaused={isPaused}
        isHighContrast={settings.isHighContrast}
      />
      {modals.isOpen('quit') && (
        <QuitModal
          open={true}
          onOpenChange={(open) => modals.onOpenChange('quit', open)}
          day={gameStatistics?.day || 1}
          onQuitToStart={handleQuitToStart}
          onReplayDay={navigateToDay}
          onNextDay={handleNextDay}
          isHighContrast={settings.isHighContrast}
        />
      )}
      <DayTransitionModal
        isDayTransition={dayFlow.isTransitioning}
        isDayFinished={dayFlow.isDayFinished}
        targetDay={dayFlow.targetDay}
        currentBriefing={dayFlow.briefing}
        dayResultDetails={dayFlow.resultDetails}
        gameStatistics={gameStatistics}
        isHighContrast={settings.isHighContrast}
        onStartDay={handleStartDay}
        onClose={() => setDayFlow(prev => ({ ...prev, isTransitioning: false }))}
        onReplayDay={navigateToDay}
        onNextDay={handleNextDay}
      />
      <NotificationDialog
        open={modals.isOpen('alerts')}
        onOpenChange={(open) => modals.onOpenChange('alerts', open)}
        title="Alerts"
        description="Critical and informational messages about the grid status."
        items={alerts}
        onRemove={(id) => setAlerts(prev => prev.filter(a => a.id !== id))}
        onDismissAll={() => setAlerts([])}
        emptyMessage="No alerts to show"
        ariaLabel="List of alerts"
      />
      <NotificationDialog
        open={modals.isOpen('hints')}
        onOpenChange={(open) => modals.onOpenChange('hints', open)}
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

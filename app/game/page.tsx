"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"
import { Substation, Branch } from "@/lib/types"
import { useCreateEngine } from "@/lib/hooks/use-engine"
import { EngineContext, useStore, useStats, useAlerts, useHints, useIsBlackout, useActions, useDayTransitionId } from "@/lib/hooks/use-store"
import { useInput } from "@/lib/hooks/use-input"
import { useAppSettings } from "@/lib/hooks/use-app-settings"
import { useModals } from "@/lib/hooks/use-modals"
import { useIsMobile } from "@/lib/hooks/use-mobile"
import { GameEngine } from "@/lib/engine"
import { AppHeader } from "@/components/game/header"
import { KeyStats, Dashboard } from "@/components/game/dashboard"
import { DayTimeDisplay } from "@/components/game/day-time-display"
import { SubstationModal } from "@/components/modals/substation-modal"
import { BranchModal } from "@/components/modals/branch-modal"
import { QuitModal } from "@/components/modals/quit-modal"
import { AccessibilityModal } from "@/components/modals/accessibility-modal"
import { NotificationDialog } from "@/components/modals/notification-dialog"
import { SubstationsList } from "@/components/tables/substation-table"
import { BranchesList } from "@/components/tables/branch-table"
import { SubstationIcon } from "@/components/icons/substation-icon"
import { LinesIcon } from "@/components/icons/lines-icon"
import { HelpModal } from "@/components/modals/help-modal"
import { DayTransitionModal } from "@/components/modals/day-transition-modal"
import { ErrorBoundary } from "@/components/error-boundary"

const isStaticExport = process.env.NODE_ENV === 'production';

/**
 * Outer shell: creates the engine and provides it via context.
 *
 * On the first render the SVG container is shown bare so the engine effect
 * can attach to it. Once the engine is ready, GameUI mounts and reparents
 * the SVG into its layout.
 */
function GamePageContent() {
  const initRef = useRef<HTMLDivElement>(null);
  const engine = useCreateEngine(initRef);

  return (
    <EngineContext.Provider value={engine}>
      <div className="flex flex-col h-screen w-full overflow-hidden bg-background select-none">
        {engine ? (
          <GameUI engine={engine} />
        ) : (
          /* Temporary container — the engine attaches its SVG here on mount. */
          <div ref={initRef} className="flex-1" />
        )}
      </div>
    </EngineContext.Provider>
  );
}

/**
 * Inner game UI — all hooks that need the engine live here, inside the
 * context provider.
 */
function GameUI({ engine }: { engine: GameEngine }) {
  // --- Reparent SVG into the real layout container ---
  const svgRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (svgRef.current) engine.reparent(svgRef.current);
  }, [engine]);

  // --- App Settings ---
  const { settings, updateSettings } = useAppSettings();

  // --- Modal Management ---
  const modals = useModals();

  // --- Routing ---
  const searchParams = useSearchParams();
  const router = useRouter();
  const showTutorial = searchParams.get('tutorial') === 'true';

  // --- Theme & Mobile ---
  const { resolvedTheme } = useTheme();
  const isMobile = useIsMobile();

  // --- Sync modal pause to engine ---
  useEffect(() => {
    engine.setModalPaused(modals.isPausingModal);
  }, [engine, modals.isPausingModal]);

  // Sync config to engine
  useEffect(() => {
    engine.applySettings({
      theme: resolvedTheme as 'light' | 'dark' | undefined,
      animationsEnabled: settings.animationsEnabled,
      renderMapLabels: settings.renderMapLabels,
      keyBindings: settings.keyBindings,
      zoomSensitivity: settings.zoomSensitivity,
    });
  }, [engine, resolvedTheme, settings.animationsEnabled, settings.renderMapLabels, settings.keyBindings, settings.zoomSensitivity]);

  // --- Interaction (SVG click → open modal) ---
  const handleSubstationSelect = useCallback((sub: Substation) => {
    modals.openModal('substation', { substationId: sub.Number });
    setAnnouncement(`Opened modal for ${sub.Name} substation.`);
  }, [modals]);

  const handleBranchSelect = useCallback((branch: Branch) => {
    modals.openModal('branch', { branchId: branch.Number });
    setAnnouncement(`Opened modal for line from ${branch.sub1?.Name} to ${branch.sub2?.Name}.`);
  }, [modals]);

  useEffect(() => {
    engine.onInteract = (type, data) => {
      if (type === 'sub') handleSubstationSelect(data as Substation);
      else if (type === 'branch') handleBranchSelect(data as Branch);
    };
  }, [engine, handleSubstationSelect, handleBranchSelect]);

  // --- Day Lifecycle (bridge: engine state → modal opens) ---
  const [isInitialTutorial, setIsInitialTutorial] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const dayTransitionId = useDayTransitionId();
  const prevTransitionIdRef = useRef(engine.dayTransitionId);

  // Bridge effect: when the engine transitions day phase, open the right modal
  useEffect(() => {
    if (dayTransitionId === prevTransitionIdRef.current) return;
    prevTransitionIdRef.current = dayTransitionId;
    if (engine.dayPhase === 'briefing') {
      modals.replaceModal('day-briefing', { targetDay: engine.targetDay, briefing: engine.currentBriefing });
    } else if (engine.dayPhase === 'results') {
      modals.replaceModal('day-results', { targetDay: engine.targetDay, resultDetails: engine.lastResults, gameStatistics: engine.lastResultStats ?? undefined });
      setAnnouncement(`Day ${engine.targetDay} complete.`);
    }
  }, [dayTransitionId, engine, modals]);

  // Initialization: start first day or open tutorial
  useEffect(() => {
    if (showTutorial) {
      modals.openModal('help');
      setIsInitialTutorial(true);
    } else {
      engine.navigateToDay(1);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  const openBriefing = useCallback(() => {
    const stats = engine.getStats();
    const briefing = engine.getBriefingForDay(stats.day);
    modals.openModal('day-briefing', { targetDay: stats.day, briefing });
  }, [engine, modals]);

  // --- Input Handling ---
  const isInputBlockedRef = useRef(false);
  useEffect(() => { isInputBlockedRef.current = modals.isAnyModalOpen; }, [modals.isAnyModalOpen]);

  const isBlackout = useIsBlackout();

  useInput({ engine, keyBindings: settings.keyBindings, isInputBlockedRef, isBlackout });

  const isDayTransitionModal = modals.isOpen('day-briefing') || modals.isOpen('day-results');

  // --- Layout ---
  const SidebarPanel = (
    <aside
      className={cn("bg-sidebar overflow-y-auto", isMobile ? "border-t-4 border-border" : "w-[400px] flex-shrink-0 border-r border-border")}
      role="complementary"
      aria-label="Game Sidebar"
    >
      <div className="font-share-tech flex flex-col p-4 h-full">
        <SidebarContent />
      </div>
    </aside>
  );

  const MainPanel = (
    <main className="flex-1 min-w-0 h-full flex flex-col" aria-label="Main game area">
      <div className="font-share-tech relative flex-1 w-full h-full flex flex-col">
        {settings.viewMode !== 'tabular' && (
          <div className="absolute top-4 left-4 z-10 pointer-events-none select-none bg-background/80 backdrop-blur-sm px-5 py-2.5 rounded-md border border-border/50 shadow-sm">
            <MapTimeOverlay />
          </div>
        )}
        <div
          ref={svgRef}
          tabIndex={0}
          aria-label="Interactive Texas electrical grid map"
          role="application"
          className={`h-full w-full outline-none focus-visible:ring-2 focus-visible:ring-primary ${settings.viewMode !== 'map' ? 'hidden' : ''}`}
        ></div>
        {settings.viewMode === 'tabular' && (
          <TabularView
            onSubstationSelect={handleSubstationSelect}
            onBranchSelect={handleBranchSelect}
          />
        )}
      </div>
    </main>
  );

  return (
    <>
      <AppHeader
        onOpenModal={modals.openModal}
        onBriefingClick={openBriefing}
        controlsDisabled={isDayTransitionModal}
        isHighContrast={settings.isHighContrast}
        isBlackout={isBlackout}
      />
      <div className={cn("flex-1 w-full max-w-[1920px] mx-auto border-x border-border flex overflow-hidden", isMobile ? "flex-col" : "flex-row")}>
        {isMobile ? <>{MainPanel}{SidebarPanel}</> : <>{SidebarPanel}{MainPanel}</>}
      </div>

      {/* Modals */}
      {modals.isOpen('help') && (
        <HelpModal
          open={true}
          onOpenChange={(open: boolean) => {
            modals.onOpenChange('help', open);
            if (!open && isInitialTutorial) {
              setIsInitialTutorial(false);
              engine.navigateToDay(1);
            }
          }}
        />
      )}
      {modals.isOpen('accessibility') && (
        <AccessibilityModal
          open={true}
          onOpenChange={(open) => modals.onOpenChange('accessibility', open)}
          settings={settings}
          onSettingsChange={updateSettings}
        />
      )}
      {modals.isOpen('substation') && (
        <SubstationModal
          open={true}
          subId={modals.payload.substationId}
          onClose={modals.closeModal}
          isHighContrast={settings.isHighContrast}
        />
      )}
      {modals.isOpen('branch') && (
        <BranchModal
          open={true}
          branchId={modals.payload.branchId}
          onClose={modals.closeModal}
          isHighContrast={settings.isHighContrast}
        />
      )}
      {modals.isOpen('quit') && (
        <QuitModal
          open={true}
          onOpenChange={(open) => modals.onOpenChange('quit', open)}
          day={engine.state.day}
          onQuitToStart={() => router.push(isStaticExport ? './index.html' : '/')}
          onReplayDay={(day: number) => engine.navigateToDay(day)}
          onNextDay={() => engine.advanceToNextDay()}
          isHighContrast={settings.isHighContrast}
        />
      )}
      {(modals.isOpen('day-briefing') || modals.isOpen('day-results')) && (
        <DayTransitionModal
          open={true}
          mode={modals.isOpen('day-results') ? 'results' : 'briefing'}
          targetDay={modals.payload.targetDay ?? 1}
          briefing={modals.payload.briefing}
          resultDetails={modals.payload.resultDetails}
          gameStatistics={modals.payload.gameStatistics ?? engine.getStats()}
          isHighContrast={settings.isHighContrast}
          onStartDay={() => { engine.beginDay(); modals.closeModal(); }}
          onClose={modals.closeModal}
          onReplayDay={(day: number) => engine.navigateToDay(day)}
          onNextDay={() => engine.advanceToNextDay()}
        />
      )}
      {modals.isOpen('alerts') && (
        <AlertsModal onOpenChange={(open) => modals.onOpenChange('alerts', open)} />
      )}
      {modals.isOpen('hints') && (
        <HintsModal onOpenChange={(open) => modals.onOpenChange('hints', open)} />
      )}

      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
    </>
  );
}

// --- Small subscribing components (thin, no wrapper overhead) ---

function SidebarContent() {
  const stats = useStats();
  return (
    <>
      <KeyStats stats={stats} aria-label="Game information dashboard" />
      <div className="flex-1 flex flex-col min-h-0 mt-4">
        <div className="flex-1 overflow-y-auto pr-2 -mr-2">
          <Dashboard stats={stats} />
        </div>
      </div>
    </>
  );
}

function MapTimeOverlay() {
  const stats = useStats();
  return <DayTimeDisplay day={stats.day} timeStr={stats.timeStr} idPrefix="vis" size="lg" />;
}

function TabularView({ onSubstationSelect, onBranchSelect }: {
  onSubstationSelect: (sub: Substation) => void;
  onBranchSelect: (branch: Branch) => void;
}) {
  const stats = useStats();
  const subs = useStore(e => e.state.subs);
  const branches = useStore(e => e.state.branches);
  return (
    <div className="absolute inset-0 flex flex-col md:flex-row overflow-hidden bg-background text-foreground font-share-tech">
      <div className="flex-1 border-b md:border-b-0 md:border-r p-4 flex flex-col min-h-0">
        <div className="flex justify-between items-baseline mb-4">
          <h2 className="text-xl font-bold uppercase text-muted-foreground flex items-center gap-2"><SubstationIcon className="h-5 w-5" aria-hidden="true" />Substations</h2>
          <DayTimeDisplay day={stats.day} timeStr={stats.timeStr} idPrefix="tab" size="sm" />
        </div>
        <div className="flex-1 overflow-y-auto -mr-4 pr-4">
          <SubstationsList subs={subs} onSubstationSelect={onSubstationSelect} />
        </div>
      </div>
      <div className="flex-1 p-4 flex flex-col min-h-0">
        <h2 className="text-xl font-bold mb-4 uppercase text-muted-foreground flex items-center gap-2"><LinesIcon className="h-7 w-7" aria-hidden="true" />Transmission Lines</h2>
        <div className="flex-1 overflow-y-auto -mr-4 pr-4">
          <BranchesList branches={branches} onBranchSelect={onBranchSelect} />
        </div>
      </div>
    </div>
  );
}

function AlertsModal({ onOpenChange }: { onOpenChange: (open: boolean) => void }) {
  const alerts = useAlerts();
  const { dismissAlert, dismissAllAlerts } = useActions();
  return (
    <NotificationDialog
      open={true}
      onOpenChange={onOpenChange}
      title="Alerts"
      description="Critical and informational messages about the grid status."
      items={alerts}
      onRemove={dismissAlert}
      onDismissAll={dismissAllAlerts}
      emptyMessage="No alerts to show"
      ariaLabel="List of alerts"
    />
  );
}

function HintsModal({ onOpenChange }: { onOpenChange: (open: boolean) => void }) {
  const hints = useHints();
  const { dismissHint, dismissAllHints } = useActions();
  return (
    <NotificationDialog
      open={true}
      onOpenChange={onOpenChange}
      title="Hints"
      description="Suggestions and guidance for managing the grid."
      items={hints}
      onRemove={dismissHint}
      onDismissAll={dismissAllHints}
      emptyMessage="No hints to show"
      ariaLabel="List of hints"
    />
  );
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

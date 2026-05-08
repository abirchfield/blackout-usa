<script lang="ts">
  import { untrack } from 'svelte';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { cn } from '$lib/utils';
  import type { GameEngine } from '$lib/engine';
  import type { Substation, Branch } from '$lib/types';
  import { initEngineContext } from '$lib/stores/engine.svelte';
  import { createModalState } from '$lib/stores/modals.svelte';
  import { settings } from '$lib/stores/settings.svelte';
  import { theme } from '$lib/stores/theme.svelte';
  import { mobile } from '$lib/stores/mobile.svelte';
  import { KeyboardController } from '$lib/keyboard.svelte';

  import AppHeader from '$components/game/AppHeader.svelte';
  import KeyStats from '$components/game/KeyStats.svelte';
  import Dashboard from '$components/game/Dashboard.svelte';
  import DayTimeDisplay from '$components/game/DayTimeDisplay.svelte';
  import ForecastChart from '$components/game/ForecastChart.svelte';
  import { GAME_DURATION_S } from '$lib/grid/constants';
  import SubstationTable from '$components/tables/SubstationTable.svelte';
  import BranchTable from '$components/tables/BranchTable.svelte';

  import HelpModal from '$components/modals/HelpModal.svelte';
  import AccessibilityModal from '$components/modals/AccessibilityModal.svelte';
  import GridModal from '$components/modals/GridModal.svelte';
  import QuitModal from '$components/modals/QuitModal.svelte';
  import DayTransitionModal from '$components/modals/DayTransitionModal.svelte';
  import NotificationDialog from '$components/modals/NotificationDialog.svelte';

  interface Props {
    engine: GameEngine;
    tutorial: boolean;
  }

  let { engine, tutorial }: Props = $props();

  // --- Modal state scoped to this game session ---
  const modals = createModalState();

  // --- Set up context (synchronous during init, engine never changes) ---
  // svelte-ignore state_referenced_locally
  const engineState = initEngineContext(engine);

  $effect(() => () => engineState.destroy());

  let forecastProgress = $derived(engineState.stats.timeStep / GAME_DURATION_S);

  // --- State ---
  let mapContainer: HTMLDivElement;
  let isInitialTutorial = $state(false);
  let announcement = $state('');

  // --- Reparent canvas into the real layout container ---
  $effect(() => {
    if (mapContainer) engine.reparent(mapContainer);
  });

  // --- Sync modal pause to engine ---
  $effect(() => {
    engine.externalPaused = modals.isPausingModal;
  });

  // --- Sync settings to engine ---
  $effect(() => {
    engine.applySettings({
      theme: theme.resolved as 'light' | 'dark' | undefined,
      animationsEnabled: settings.current.animationsEnabled,
      renderMapLabels: settings.current.renderMapLabels,
      keyBindings: settings.current.keyBindings,
      zoomSensitivity: settings.current.zoomSensitivity,
    });
  });

  // --- Map click → open modal ---
  function handleSubstationSelect(sub: Substation) {
    modals.openModal('grid', { substationId: sub.Number });
    announcement = `Opened modal for ${sub.Name} substation.`;
  }

  function handleBranchSelect(branch: Branch) {
    modals.openModal('grid', { branchId: branch.Number });
    announcement = `Opened modal for line from ${branch.sub1?.Name} to ${branch.sub2?.Name}.`;
  }

  $effect(() => {
    engine.onInteract = (type: string, data: unknown) => {
      if (type === 'sub') handleSubstationSelect(data as Substation);
      else if (type === 'branch') handleBranchSelect(data as Branch);
    };
  });

  // --- Day Lifecycle bridge ---
  // dayVersion starts at 0; navigateToDay() increments it to 1+.
  // Skip version 0 to avoid acting on the pre-navigation initial state.
  // Uses $effect.pre so it runs BEFORE DOM updates and child effects —
  // a rendering error in a child component (e.g. ForecastChart) must never
  // block the game lifecycle from opening briefing/results modals.
  $effect.pre(() => {
    const v = engineState.dayVersion;
    if (v === 0) return;
    const phase = engineState.dayPhase;

    if (phase === 'briefing') {
      modals.openModal('day-briefing', { targetDay: engine.targetDay, info: engine.currentInfo });
    } else if (phase === 'results') {
      modals.openModal('day-results', {
        targetDay: engine.targetDay,
        resultDetails: engine.lastResults,
        gameStatistics: engine.lastResultStats ?? undefined,
      });
      announcement = `Day ${engine.targetDay} complete.`;
    }
  });

  // --- Initialization (run once on mount) ---
  $effect(() => {
    untrack(() => {
      if (tutorial) {
        modals.openModal('help');
        isInitialTutorial = true;
      } else {
        engine.navigateToDay(1);
      }
    });
  });

  function openBriefing() {
    const info = engine.currentInfo;
    modals.openModal('day-briefing', { targetDay: engine.stats.day, info });
  }

  // --- Keyboard input ---
  let isDayTransitionModal = $derived(
    modals.activeModal === 'day-briefing' || modals.activeModal === 'day-results'
  );

  // svelte-ignore state_referenced_locally
  const kbController = new KeyboardController(() => ({
    engine,
    keyBindings: settings.current.keyBindings,
    isBlocked: () => modals.isAnyModalOpen,
    isBlackout: () => engineState.isBlackout,
  }));

  $effect(() => () => kbController.destroy());
</script>

<a href="#main-game" class="sr-only focus:not-sr-only focus:absolute focus:z-100 focus:top-2 focus:left-2 focus:bg-background focus:text-foreground focus:px-4 focus:py-2 focus:rounded-md focus:border focus:border-border focus:shadow-md focus:text-sm focus:font-medium">
  Skip to game
</a>

<h1 class="sr-only">Blackout USA — {engine.caseName} Grid</h1>

<AppHeader
  onOpenModal={modals.openModal}
  onBriefingClick={openBriefing}
  controlsDisabled={isDayTransitionModal}
  isBlackout={engineState.isBlackout}
/>

<div class={cn(
  "flex-1 w-full max-w-[1920px] mx-auto border-x border-border flex overflow-hidden",
  mobile.value ? "flex-col" : "flex-row"
)}>
  {#if mobile.value}
    <!-- Mobile: map on top, sidebar below -->
    {@render mainPanel()}
    {@render sidebarPanel()}
  {:else}
    <!-- Desktop: sidebar on left, map on right -->
    {@render sidebarPanel()}
    {@render mainPanel()}
  {/if}
</div>

<!-- Modals — always mounted, controlled via `open` prop so bits-ui can
     properly manage its Portal/Overlay lifecycle (no orphaned overlays). -->
<HelpModal
  open={modals.activeModal === 'help'}
  onOpenChange={(open: boolean) => {
    if (!open && isInitialTutorial) {
      isInitialTutorial = false;
      modals.closeModal();
      engine.navigateToDay(1);
      return;
    }
    modals.onOpenChange('help', open);
  }}
/>

<AccessibilityModal
  open={modals.activeModal === 'accessibility'}
  onOpenChange={(open: boolean) => modals.onOpenChange('accessibility', open)}
/>

<GridModal
  open={modals.activeModal === 'grid'}
  substationId={modals.payload.substationId}
  branchId={modals.payload.branchId}
  onClose={modals.closeModal}
/>

<QuitModal
  open={modals.activeModal === 'quit'}
  onOpenChange={(open: boolean) => modals.onOpenChange('quit', open)}
  day={engine.targetDay}
  onQuitToStart={() => goto(`${base}/`)}
  onReplayDay={(day: number) => { modals.closeModal(); engine.navigateToDay(day); }}
  onNextDay={() => { modals.closeModal(); engine.advanceToNextDay(); }}
/>

<DayTransitionModal
  open={modals.activeModal === 'day-briefing' || modals.activeModal === 'day-results'}
  mode={modals.activeModal === 'day-results' ? 'results' : 'briefing'}
  targetDay={modals.payload.targetDay ?? 1}
  info={modals.payload.info}
  resultDetails={modals.payload.resultDetails}
  gameStatistics={modals.payload.gameStatistics ?? engine.stats}
  onStartDay={() => { modals.closeModal(); engine.startDay(); }}
  onClose={modals.closeModal}
  onReplayDay={(day: number) => { modals.closeModal(); engine.navigateToDay(day); }}
  onNextDay={() => { modals.closeModal(); engine.advanceToNextDay(); }}
/>

<NotificationDialog
  open={modals.activeModal === 'alerts'}
  onOpenChange={(open: boolean) => modals.onOpenChange('alerts', open)}
  title="Alerts"
  description="Critical and informational messages about the grid status."
  items={engineState.alerts}
  onRemove={(id) => engine.dismissAlert(id)}
  onDismissAll={() => engine.dismissAllAlerts()}
  emptyMessage="No alerts to show"
  ariaLabel="List of alerts"
/>

<NotificationDialog
  open={modals.activeModal === 'hints'}
  onOpenChange={(open: boolean) => modals.onOpenChange('hints', open)}
  title="Hints"
  description="Suggestions and guidance for managing the grid."
  items={engineState.hints}
  onRemove={(id) => engine.dismissHint(id)}
  onDismissAll={() => engine.dismissAllHints()}
  emptyMessage="No hints to show"
  ariaLabel="List of hints"
/>

<div aria-live="polite" aria-atomic="true" class="sr-only">
  {announcement}
</div>

{#snippet sidebarPanel()}
  <aside
    class={cn(
      "bg-sidebar overflow-y-auto",
      mobile.value
        ? "border-t-2 border-border"
        : "w-[clamp(280px,35%,400px)] shrink-0 border-r border-border"
    )}
    aria-label="Game Sidebar"
  >
    <div class="font-sans flex flex-col p-4 h-full">
      <KeyStats stats={engineState.stats} />
      <div class="flex-1 flex flex-col min-h-0 mt-4">
        <div class="flex-1 overflow-y-auto pr-2 -mr-2">
          <Dashboard stats={engineState.stats} />
        </div>
      </div>
    </div>
  </aside>
{/snippet}

{#snippet mainPanel()}
  <main id="main-game" class="flex-1 min-w-0 h-full flex flex-col" aria-label="Main game area">
    <div class="font-sans relative flex-1 w-full h-full flex flex-col">
      {#if settings.current.viewMode === 'map'}
        <div class="absolute top-2 left-2 sm:top-4 sm:left-4 z-10 pointer-events-none select-none bg-background/90 px-3 py-1.5 sm:px-5 sm:py-2.5 rounded-md border border-border/50 shadow-sm">
          <DayTimeDisplay day={engineState.stats.day} timeStr={engineState.stats.timeStr} timeIso={engineState.stats.timeIso} idPrefix="vis" size="lg" />
        </div>
        <!-- Desktop: top-right overlay; Mobile: bottom strip -->
        {#if engineState.forecast}
          <div class="absolute z-10 pointer-events-none select-none bg-background/90 border border-border/50 shadow-md
            bottom-2 left-2 right-2 rounded-md
            sm:bottom-auto sm:left-auto sm:top-4 sm:right-4 sm:w-[min(45%,380px)] sm:rounded-md">
            <section class="px-2.5 py-1.5" aria-label="Demand forecast">
              <ForecastChart forecast={engineState.forecast} progress={forecastProgress} />
            </section>
          </div>
        {/if}
      {/if}
      <!-- svelte-ignore a11y_no_noninteractive_tabindex — role="application" makes this
           an interactive widget (canvas with click/drag), tabindex=-1 allows programmatic
           focus for keyboard shortcuts without adding it to the tab sequence -->
      <div
        bind:this={mapContainer}
        tabindex={settings.current.viewMode === 'map' ? -1 : undefined}
        aria-label={settings.current.viewMode === 'map' ? 'Interactive electrical grid map. Click substations or lines to inspect. For full keyboard access, switch to Tabular mode in Settings.' : 'Electrical grid map'}
        role={settings.current.viewMode === 'map' ? 'application' : 'img'}
        aria-hidden={settings.current.viewMode !== 'map' ? true : undefined}
        class={cn("h-full w-full outline-none focus-visible:ring-2 focus-visible:ring-primary", settings.current.viewMode !== 'map' && 'hidden')}
      ></div>
      {#if settings.current.viewMode === 'tabular'}
        <!-- Mobile: single scrollable column; Desktop: side-by-side panels -->
        <div class="absolute inset-0 overflow-y-auto md:overflow-hidden md:flex md:flex-row bg-background text-foreground font-sans">
          <div class="md:flex-1 border-b md:border-b-0 md:border-r p-4 md:flex md:flex-col md:min-h-0">
            <div class="flex justify-between items-baseline mb-4">
              <h2 class="text-xl font-bold uppercase text-muted-foreground">Substations</h2>
              <DayTimeDisplay day={engineState.stats.day} timeStr={engineState.stats.timeStr} timeIso={engineState.stats.timeIso} idPrefix="tab" size="sm" />
            </div>
            <div class="md:flex-1 md:overflow-y-auto md:-mr-4 md:pr-4">
              <SubstationTable subs={engineState.subs} onSubstationSelect={handleSubstationSelect} />
            </div>
          </div>
          <div class="md:flex-1 p-4 md:flex md:flex-col md:min-h-0">
            <h2 class="text-xl font-bold mb-4 uppercase text-muted-foreground">Transmission Lines</h2>
            <div class="md:flex-1 md:overflow-y-auto md:-mr-4 md:pr-4">
              <BranchTable branches={engineState.branches} onBranchSelect={handleBranchSelect} />
            </div>
          </div>
        </div>
      {/if}
    </div>
  </main>
{/snippet}

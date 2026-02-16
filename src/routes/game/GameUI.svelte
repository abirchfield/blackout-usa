<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { cn } from '$lib/utils';
  import type { GameEngine } from '$lib/engine';
  import type { Substation, Branch } from '$lib/types';
  import {
    setEngine, setEngineStores, setEngineActions,
    createEngineStores, createActions
  } from '$lib/stores/engine';
  import { modals } from '$lib/stores/modals';
  import { settings } from '$lib/stores/settings';
  import { resolvedTheme } from '$lib/stores/theme';
  import { isMobile } from '$lib/stores/mobile';
  import { keyboard } from '$lib/actions/keyboard';

  import AppHeader from '$components/game/AppHeader.svelte';
  import KeyStats from '$components/game/KeyStats.svelte';
  import Dashboard from '$components/game/Dashboard.svelte';
  import DayTimeDisplay from '$components/game/DayTimeDisplay.svelte';
  import ForecastPanel from '$components/game/ForecastPanel.svelte';
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

  // --- Set up context (synchronous during init, engine never changes) ---
  // svelte-ignore state_referenced_locally
  setEngine(engine);
  // svelte-ignore state_referenced_locally
  const stores = createEngineStores(engine);
  setEngineStores(stores);
  // svelte-ignore state_referenced_locally
  const actions = createActions(engine);
  setEngineActions(actions);

  // --- Destructure stores ---
  const { stats, isBlackout, alerts, hints, dayTransitionId, subs, branches } = stores;
  const activeModal = modals.activeModal;
  const modalPayload = modals.payload;
  const isPausingModal = modals.isPausingModal;
  const isAnyModalOpenStore = modals.isAnyModalOpen;

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
    engine.externalPaused = $isPausingModal;
  });

  // --- Sync settings to engine ---
  $effect(() => {
    engine.applySettings({
      theme: $resolvedTheme as 'light' | 'dark' | undefined,
      animationsEnabled: $settings.animationsEnabled,
      renderMapLabels: $settings.renderMapLabels,
      keyBindings: $settings.keyBindings,
      zoomSensitivity: $settings.zoomSensitivity,
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
  // svelte-ignore state_referenced_locally
  let prevTransitionId = engine.dayTransitionId;

  $effect(() => {
    const id = $dayTransitionId;
    if (id === prevTransitionId) return;
    prevTransitionId = id;

    if (engine.dayPhase === 'briefing') {
      modals.replaceModal('day-briefing', { targetDay: engine.targetDay, info: engine.currentInfo });
    } else if (engine.dayPhase === 'results') {
      modals.replaceModal('day-results', {
        targetDay: engine.targetDay,
        resultDetails: engine.lastResults,
        gameStatistics: engine.lastResultStats ?? undefined,
      });
      announcement = `Day ${engine.targetDay} complete.`;
    }
  });

  // --- Initialization (run once on mount) ---
  onMount(() => {
    if (tutorial) {
      modals.openModal('help');
      isInitialTutorial = true;
    } else {
      engine.navigateToDay(1);
    }
  });

  function openBriefing() {
    const info = engine.getInfoForDay(engine.stats.day);
    modals.openModal('day-briefing', { targetDay: engine.stats.day, info });
  }

  // --- Keyboard input ---
  let isAnyModalOpen = $derived($isAnyModalOpenStore);
  let isDayTransitionModal = $derived(
    $activeModal === 'day-briefing' || $activeModal === 'day-results'
  );

  // Global keyboard handler (use $effect since actions can't go on svelte:window)
  $effect(() => {
    const params = {
      engine,
      keyBindings: $settings.keyBindings,
      isBlocked: () => isAnyModalOpen,
      isBlackout: $isBlackout,
    };
    const action = keyboard(document.body, params);
    return () => action.destroy();
  });
</script>

<AppHeader
  onOpenModal={modals.openModal}
  onBriefingClick={openBriefing}
  controlsDisabled={isDayTransitionModal}
  isHighContrast={$settings.isHighContrast}
  isBlackout={$isBlackout}
/>

<div class={cn(
  "flex-1 w-full max-w-[1920px] mx-auto border-x border-border flex overflow-hidden",
  $isMobile ? "flex-col" : "flex-row"
)}>
  {#if $isMobile}
    <!-- Mobile: map on top, sidebar below -->
    {@render mainPanel()}
    {@render sidebarPanel()}
  {:else}
    <!-- Desktop: sidebar on left, map on right -->
    {@render sidebarPanel()}
    {@render mainPanel()}
  {/if}
</div>

<!-- Modals -->
{#if $activeModal === 'help'}
  <HelpModal
    open={true}
    onOpenChange={(open: boolean) => {
      modals.onOpenChange('help', open);
      if (!open && isInitialTutorial) {
        isInitialTutorial = false;
        engine.navigateToDay(1);
      }
    }}
  />
{/if}

{#if $activeModal === 'accessibility'}
  <AccessibilityModal
    open={true}
    onOpenChange={(open: boolean) => modals.onOpenChange('accessibility', open)}
    settings={$settings}
    onSettingsChange={(patch) => settings.update(patch)}
  />
{/if}

{#if $activeModal === 'grid'}
  <GridModal
    open={true}
    substationId={$modalPayload.substationId}
    branchId={$modalPayload.branchId}
    onClose={modals.closeModal}
    isHighContrast={$settings.isHighContrast}
  />
{/if}

{#if $activeModal === 'quit'}
  <QuitModal
    open={true}
    onOpenChange={(open: boolean) => modals.onOpenChange('quit', open)}
    day={engine.targetDay}
    onQuitToStart={() => goto(`${base}/`)}
    onReplayDay={(day: number) => engine.navigateToDay(day)}
    onNextDay={() => engine.advanceToNextDay()}
    isHighContrast={$settings.isHighContrast}
  />
{/if}

{#if $activeModal === 'day-briefing' || $activeModal === 'day-results'}
  <DayTransitionModal
    open={true}
    mode={$activeModal === 'day-results' ? 'results' : 'briefing'}
    targetDay={$modalPayload.targetDay ?? 1}
    info={$modalPayload.info}
    resultDetails={$modalPayload.resultDetails}
    gameStatistics={$modalPayload.gameStatistics ?? engine.stats}
    isHighContrast={$settings.isHighContrast}
    onStartDay={() => { engine.startDay(); modals.closeModal(); }}
    onClose={modals.closeModal}
    onReplayDay={(day: number) => engine.navigateToDay(day)}
    onNextDay={() => engine.advanceToNextDay()}
  />
{/if}

{#if $activeModal === 'alerts'}
  <NotificationDialog
    open={true}
    onOpenChange={(open: boolean) => modals.onOpenChange('alerts', open)}
    title="Alerts"
    description="Critical and informational messages about the grid status."
    items={$alerts}
    onRemove={actions.dismissAlert}
    onDismissAll={actions.dismissAllAlerts}
    emptyMessage="No alerts to show"
    ariaLabel="List of alerts"
  />
{/if}

{#if $activeModal === 'hints'}
  <NotificationDialog
    open={true}
    onOpenChange={(open: boolean) => modals.onOpenChange('hints', open)}
    title="Hints"
    description="Suggestions and guidance for managing the grid."
    items={$hints}
    onRemove={actions.dismissHint}
    onDismissAll={actions.dismissAllHints}
    emptyMessage="No hints to show"
    ariaLabel="List of hints"
  />
{/if}

<div aria-live="polite" aria-atomic="true" class="sr-only">
  {announcement}
</div>

{#snippet sidebarPanel()}
  <aside
    class={cn(
      "bg-sidebar overflow-y-auto",
      $isMobile
        ? "border-t-4 border-border"
        : "w-[clamp(280px,35%,400px)] flex-shrink-0 border-r border-border"
    )}
    aria-label="Game Sidebar"
  >
    <div class="font-sans flex flex-col p-4 h-full">
      <KeyStats stats={$stats} />
      <div class="flex-1 flex flex-col min-h-0 mt-4">
        <div class="flex-1 overflow-y-auto pr-2 -mr-2">
          <Dashboard stats={$stats} />
        </div>
      </div>
    </div>
  </aside>
{/snippet}

{#snippet mainPanel()}
  <main class="flex-1 min-w-0 h-full flex flex-col" aria-label="Main game area">
    <div class="font-sans relative flex-1 w-full h-full flex flex-col">
      {#if $settings.viewMode !== 'tabular'}
        <div class="absolute top-4 left-4 z-10 pointer-events-none select-none bg-background/80 backdrop-blur-sm px-5 py-2.5 rounded-md border border-border/50 shadow-sm">
          <DayTimeDisplay day={$stats.day} timeStr={$stats.timeStr} idPrefix="vis" size="lg" />
        </div>
        <div class="absolute top-4 right-4 z-10 pointer-events-none select-none bg-background/80 backdrop-blur-sm rounded-md border border-border/50 shadow-md hidden sm:block w-[min(45%,380px)]">
          <ForecastPanel />
        </div>
      {/if}
      <div
        bind:this={mapContainer}
        tabindex="-1"
        aria-label="Interactive Texas electrical grid map"
        role="application"
        class="h-full w-full outline-none focus-visible:ring-2 focus-visible:ring-primary {$settings.viewMode !== 'map' ? 'hidden' : ''}"
      ></div>
      {#if $settings.viewMode === 'tabular'}
        <div class="absolute inset-0 flex flex-col md:flex-row overflow-hidden bg-background text-foreground font-sans">
          <div class="flex-1 border-b md:border-b-0 md:border-r p-4 flex flex-col min-h-0">
            <div class="flex justify-between items-baseline mb-4">
              <h2 class="text-xl font-bold uppercase text-muted-foreground">Substations</h2>
              <DayTimeDisplay day={$stats.day} timeStr={$stats.timeStr} idPrefix="tab" size="sm" />
            </div>
            <div class="flex-1 overflow-y-auto -mr-4 pr-4">
              <SubstationTable subs={$subs} onSubstationSelect={handleSubstationSelect} />
            </div>
          </div>
          <div class="flex-1 p-4 flex flex-col min-h-0">
            <h2 class="text-xl font-bold mb-4 uppercase text-muted-foreground">Transmission Lines</h2>
            <div class="flex-1 overflow-y-auto -mr-4 pr-4">
              <BranchTable branches={$branches} onBranchSelect={handleBranchSelect} />
            </div>
          </div>
        </div>
      {/if}
    </div>
  </main>
{/snippet}

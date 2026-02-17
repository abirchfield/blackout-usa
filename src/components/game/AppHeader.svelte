<script lang="ts">
  import { HelpCircle, LogOut, PersonStanding, Play, Pause, FastForward, Bell, Lightbulb, FileText, Menu, X, AlertTriangle } from 'lucide-svelte';
  import Button from '$components/ui/Button.svelte';
  import { cn } from '$lib/utils';
  import { getEngineStores, getEngine } from '$lib/stores/engine';
  import { settings } from '$lib/stores/settings.svelte';
  import { UIThresholds } from '$components/theme';
  import type { ModalId } from '$lib/stores/modals.svelte';

  interface Props {
    onOpenModal: (id: ModalId) => void;
    onBriefingClick: () => void;
    controlsDisabled?: boolean;
    isBlackout?: boolean;
  }

  let { onOpenModal, onBriefingClick, controlsDisabled, isBlackout }: Props = $props();

  const { isPaused, isFastForward, alerts, hints } = getEngineStores();
  const engine = getEngine();

  let alertsCount = $derived($alerts.length);
  let hintsCount = $derived($hints.length);

  let isMenuOpen = $state(false);

  // Track the latest critical alert to show inline
  let visibleAlert: { id: number; message: string } | null = $state(null);
  let lastShownId: number | null = $state(null);

  $effect(() => {
    if ($alerts.length === 0) return;
    const latest = $alerts[0];
    if (!latest.critical) return;
    if (latest.id === lastShownId) return;

    visibleAlert = { id: latest.id, message: latest.message };
    lastShownId = latest.id;

    const timer = setTimeout(() => { visibleAlert = null; }, UIThresholds.ALERT_DISPLAY_DURATION_MS);
    return () => clearTimeout(timer);
  });
</script>

{#snippet notificationDot(ping: boolean, color: string)}
  <span class="absolute top-1 right-1 flex h-2 w-2" aria-hidden="true">
    {#if ping}
      <span class="animate-ping absolute inline-flex h-full w-full rounded-full {color} opacity-75"></span>
    {/if}
    <span class="relative inline-flex rounded-full h-2 w-2 {color}"></span>
  </span>
{/snippet}

{#snippet timeControls()}
  <Button variant="ghost" size="icon" onclick={() => engine.togglePause()} aria-label={$isPaused ? 'Resume game' : 'Pause game'} disabled={controlsDisabled}>
    {#if $isPaused}
      <Play class="h-5 w-5 fill-current" />
    {:else}
      <Pause class="h-5 w-5 fill-current" />
    {/if}
  </Button>
  <Button variant={$isFastForward ? settings.hcVariant : 'ghost'} size="icon" onclick={() => engine.toggleFastForward()} aria-label={$isFastForward ? 'Disable fast forward' : 'Enable fast forward'} disabled={$isPaused || controlsDisabled}>
    <FastForward class="h-5 w-5 {$isFastForward ? 'fill-current' : ''}" />
  </Button>
{/snippet}

<header class="bg-background flex items-center border-b px-4 py-3 relative gap-3" aria-label="Main application header">
  <!-- Left: Title & Main Actions -->
  <div class="flex shrink-0">
    <div class="flex items-center gap-2 flex-nowrap">
      <h1 class="text-xl sm:text-2xl font-bold font-sans text-foreground">
        <span class={isBlackout ? 'text-[var(--color-alert-emphasis)] animate-pulse' : undefined}>Blackout</span> USA
      </h1>
      <!-- Desktop Controls -->
      <div class="hidden md:flex items-center gap-1 border-l ml-2 pl-2">
        {@render timeControls()}
        <Button variant="ghost" size="icon" onclick={() => onOpenModal('alerts')} class={cn('relative', alertsCount > 0 && 'text-[var(--color-alert)]')} aria-label="View alerts, {alertsCount} new notifications" disabled={controlsDisabled}>
          <Bell class="h-5 w-5" />
          {#if alertsCount > 0}
            {@render notificationDot(true, 'bg-[var(--color-alert)]')}
          {/if}
        </Button>
        <Button variant="ghost" size="icon" onclick={() => onOpenModal('hints')} class="relative" aria-label="View hints, {hintsCount} new items" disabled={controlsDisabled}>
          <Lightbulb class="h-5 w-5" />
          {#if hintsCount > 0}
            {@render notificationDot(false, 'bg-[var(--color-hint)]')}
          {/if}
        </Button>
        <Button variant="ghost" size="icon" onclick={onBriefingClick} aria-label="View briefing" disabled={controlsDisabled}>
          <FileText class="h-5 w-5" />
        </Button>
      </div>
    </div>
  </div>

  <!-- Center: Latest critical alert (desktop only) -->
  {#if visibleAlert}
    <div class="hidden md:flex flex-1 min-w-0 items-center justify-center gap-2 animate-in fade-in duration-300" role="alert">
      <AlertTriangle class="h-4 w-4 text-destructive shrink-0" aria-hidden="true" />
      <p class="text-sm font-medium text-destructive truncate">{visibleAlert.message}</p>
      <button
        onclick={() => { visibleAlert = null; }}
        class="text-destructive/60 hover:text-destructive shrink-0"
        aria-label="Dismiss alert"
      >
        <X class="h-3.5 w-3.5" />
      </button>
    </div>
  {:else}
    <div class="hidden md:block flex-1"></div>
  {/if}

  <!-- Right: Desktop Menu & Mobile Toggle -->
  <div class="flex shrink-0 items-center gap-2">
    <!-- Mobile Time Controls -->
    <div class="flex md:hidden items-center gap-1">
      {@render timeControls()}
    </div>
    <nav aria-label="Utility links" class="hidden md:flex items-center justify-end gap-2 flex-nowrap">
      <div role="group">
        <Button variant="ghost" size="icon" onclick={() => onOpenModal('accessibility')} aria-label="Accessibility Settings">
          <PersonStanding class="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onclick={() => onOpenModal('help')} aria-label="How To Play">
          <HelpCircle class="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onclick={() => onOpenModal('quit')} aria-label="Quit game">
          <LogOut class="h-4 w-4" />
        </Button>
      </div>
    </nav>

    <!-- Mobile Menu Toggle -->
    <Button variant="ghost" size="icon" class="md:hidden" onclick={() => { isMenuOpen = !isMenuOpen; }} aria-label="Toggle menu" aria-expanded={isMenuOpen}>
      {#if isMenuOpen}
        <X class="h-5 w-5" />
      {:else}
        <Menu class="h-5 w-5" />
      {/if}
    </Button>
  </div>

  <!-- Mobile Menu Overlay -->
  {#if isMenuOpen}
    <nav aria-label="Mobile menu" class="absolute top-full left-0 right-0 bg-background border-b shadow-lg z-50 p-4 md:hidden flex flex-col gap-4 animate-in slide-in-from-top-2">
      <div class="grid grid-cols-1 gap-2">
        <Button variant="ghost" onclick={() => { onOpenModal('alerts'); isMenuOpen = false; }} class="justify-start relative" disabled={controlsDisabled} aria-label="View alerts, {alertsCount} new notifications">
          <Bell class="mr-2 h-4 w-4" aria-hidden="true" />
          Alerts
          {#if alertsCount > 0}
            {@render notificationDot(true, 'bg-[var(--color-alert)]')}
          {/if}
        </Button>
        <Button variant="ghost" onclick={() => { onOpenModal('hints'); isMenuOpen = false; }} class="justify-start relative" disabled={controlsDisabled} aria-label="View hints, {hintsCount} new items">
          <Lightbulb class="mr-2 h-4 w-4" aria-hidden="true" />
          Hints
          {#if hintsCount > 0}
            {@render notificationDot(false, 'bg-[var(--color-hint)]')}
          {/if}
        </Button>
        <Button variant="ghost" onclick={() => { onBriefingClick(); isMenuOpen = false; }} class="justify-start" disabled={controlsDisabled}>
          <FileText class="mr-2 h-4 w-4" aria-hidden="true" />
          Briefing
        </Button>
        <Button variant="ghost" onclick={() => { onOpenModal('accessibility'); isMenuOpen = false; }} class="justify-start">
          <PersonStanding class="mr-2 h-4 w-4" aria-hidden="true" />
          Accessibility
        </Button>
        <Button variant="ghost" onclick={() => { onOpenModal('help'); isMenuOpen = false; }} class="justify-start">
          <HelpCircle class="mr-2 h-4 w-4" aria-hidden="true" />
          How to Play
        </Button>
        <Button variant="ghost" onclick={() => { onOpenModal('quit'); isMenuOpen = false; }} class="justify-start text-[var(--color-alert)] hover:text-[var(--color-alert-emphasis)] hover:bg-[var(--color-alert)]/10">
          <LogOut class="mr-2 h-4 w-4" aria-hidden="true" />
          Quit Game
        </Button>
      </div>
    </nav>
  {/if}
</header>

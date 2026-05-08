<script lang="ts">
  import { base } from '$app/paths';
  import Button from '$components/ui/Button.svelte';
  import { GameEngine } from '$lib/engine';
  import { loadCase, DEFAULT_CASE } from '$lib/cases/registry';
  import { theme } from '$lib/stores/theme.svelte';
  import { settings } from '$lib/stores/settings.svelte';
  import { PersonStanding, ExternalLink } from 'lucide-svelte';

  let mapContainer: HTMLDivElement;
  let engine: GameEngine | null = null;
  let selectedCase = $state(DEFAULT_CASE);
  let showAccessibility = $state(false);

  let gameUrl = $derived(`${base}/${selectedCase}`);
  let tutorialUrl = $derived(`${base}/${selectedCase}?tutorial=true`);

  // Create a non-interactive preview engine for the background map
  $effect(() => {
    // Track selectedCase for reactivity
    const caseName = selectedCase;
    if (!mapContainer) return;

    engine?.destroy();
    engine = null;

    let cancelled = false;

    loadCase(caseName).then(gridCase => {
      if (cancelled || !mapContainer) return;

      engine = new GameEngine(mapContainer, gridCase, { interactive: false });
      engine.applySettings({
        theme: theme.resolved || 'dark',
        animationsEnabled: settings.current.animationsEnabled,
        renderMapLabels: false,
        keyBindings: settings.current.keyBindings,
      });
      engine.navigateToDay(1);
      engine.startLoop();
    });

    return () => {
      cancelled = true;
      engine?.destroy();
      engine = null;
    };
  });

  // Sync settings (including theme) to engine.
  // Read reactive values BEFORE the optional chain so Svelte always tracks them
  // (engine is a plain `let`, so `engine?.` short-circuits and skips the reads
  //  when engine is null — leaving the effect with zero dependencies).
  $effect(() => {
    const resolvedTheme = theme.resolved;
    const s = settings.current;
    engine?.applySettings({
      theme: resolvedTheme || 'dark',
      animationsEnabled: s.animationsEnabled,
      renderMapLabels: s.renderMapLabels,
      keyBindings: s.keyBindings,
    });
  });
</script>

<main class="font-sans relative flex min-h-screen flex-col lg:flex-row items-center justify-center p-4 lg:p-8 gap-8">
  <div class="relative w-full lg:w-1/2 rounded-lg border bg-card p-8 text-card-foreground shadow-lg z-10">
    <div class="absolute top-4 right-4">
      <Button
        variant="ghost"
        size="icon"
        onclick={() => showAccessibility = true}
        aria-label="Accessibility Settings"
      >
        <PersonStanding class="h-6 w-6" />
      </Button>
    </div>
    <div class="grid gap-4 py-4 text-lg">
      <h1 class="text-3xl font-bold">Welcome to the Blackout USA Game!</h1>
      <p>
        Can you efficiently operate an electrical grid and keep it safe
        from a blackout?
      </p>
      <p class="text-sm text-muted-foreground">
        This game was developed by the research group of Prof. Adam
        Birchfield at Texas A&M University.

        <a
          href="https://birchfield.engr.tamu.edu"
          class="underline hover:text-primary inline-flex items-center gap-1"
          target="_blank"
          rel="noopener noreferrer"
        >
          More Information
          <ExternalLink class="h-3 w-3" aria-hidden="true" />
          <span class="sr-only">(opens in a new tab)</span>
        </a>.
      </p>
    </div>
    <div class="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Button variant="secondary" href={tutorialUrl} data-sveltekit-preload-data="tap" class="text-xl py-6 cursor-pointer">
        How to Play
      </Button>
      <Button href={gameUrl} data-sveltekit-preload-data="tap" class="text-xl py-6 cursor-pointer">
        Start my first shift!
      </Button>
    </div>
  </div>
  <div class="w-full lg:w-1/2 h-[50vh] lg:h-[70vh] rounded-lg bg-background overflow-hidden">
    <div
      bind:this={mapContainer}
      aria-label={`A static visual of the ${selectedCase} electrical grid map`}
      role="img"
      class="h-full w-full"
    ></div>
  </div>
  {#if showAccessibility}
    {#await import('$components/modals/AccessibilityModal.svelte') then { default: AccessibilityModal }}
      <AccessibilityModal
        open={true}
        onOpenChange={(open: boolean) => showAccessibility = open}
      />
    {/await}
  {/if}
</main>

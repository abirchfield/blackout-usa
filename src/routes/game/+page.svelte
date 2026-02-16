<script lang="ts">
  import { onDestroy } from 'svelte';
  import { GameEngine } from '$lib/engine';
  import { loadCase } from '$data/_out/registry';
  import GameUI from './GameUI.svelte';

  let { data } = $props();

  let initContainer = $state<HTMLDivElement>();
  let engine = $state<GameEngine | null>(null);

  // Load engine once the init container mounts
  $effect(() => {
    if (!initContainer || engine) return;

    const container = initContainer;
    let cancelled = false;

    loadCase(data.caseName).then(gridCase => {
      if (cancelled) return;
      const e = new GameEngine(container, gridCase, { interactive: true });
      e.startLoop();
      engine = e;
    });

    return () => { cancelled = true; };
  });

  // Clean up engine on component destroy (not on initContainer unmount)
  onDestroy(() => {
    engine?.destroy();
  });
</script>

<div class="flex flex-col h-screen w-full overflow-hidden bg-background select-none">
  {#if engine}
    <GameUI {engine} tutorial={data.tutorial} />
  {:else}
    <!-- Temporary container — the engine attaches its canvas here during init -->
    <div bind:this={initContainer} class="flex-1"></div>
  {/if}
</div>

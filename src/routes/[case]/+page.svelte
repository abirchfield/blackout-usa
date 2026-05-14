<script lang="ts">
  import { GameEngine } from '$lib/engine';
  import GameUI from '../GameUI.svelte';

  let { data } = $props();

  let initContainer = $state<HTMLDivElement>();
  let engine = $state<GameEngine | null>(null);

  // Create engine once the init container mounts (data already loaded by SvelteKit).
  // The `|| engine` guard prevents re-creation when the {#if} swap destroys initContainer.
  $effect(() => {
    if (!initContainer || engine) return;
    const e = new GameEngine(initContainer, data.gridCase, { interactive: true });
    e.startLoop();
    engine = e;
  });

  // Cleanup on component destroy
  $effect(() => () => { engine?.destroy(); });
</script>

<div class="flex flex-col h-screen w-full overflow-hidden bg-background select-none">
  {#if engine}
    <GameUI {engine} tutorial={data.tutorial} />
  {:else}
    <!-- Initialization host: the engine attaches its canvas here before GameUI mounts. -->
    <div bind:this={initContainer} class="flex-1"></div>
  {/if}
</div>

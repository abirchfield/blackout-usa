<script lang="ts">
  import { getEngineStores } from '$lib/stores/engine';
  import { GAME_DURATION_S } from '$lib/grid/constants';
  import ForecastChart from './ForecastChart.svelte';

  const { stats, forecast } = getEngineStores();

  let progress = $derived($stats.timeStep / GAME_DURATION_S);
</script>

{#if $forecast}
  <section class="px-2.5 py-1.5" aria-label="Demand forecast">
    <ForecastChart forecast={$forecast} {progress} />
  </section>
{/if}

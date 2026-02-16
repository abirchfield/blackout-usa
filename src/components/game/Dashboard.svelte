<script lang="ts">
  import type { StatsSnapshot } from '$lib/types';
  import { SubstationCategory, LoadCategoryType } from '$lib/types';
  import { GenerationTypeConfig, LoadTypeConfig } from '$components/theme';
  import { cn, fmtPower, fmtMoney } from '$lib/utils';

  const STAT_HERO = 'font-numeric font-bold whitespace-nowrap';
  const STAT_VALUE = 'font-numeric font-bold whitespace-nowrap';

  interface Props {
    stats: StatsSnapshot;
  }

  let { stats }: Props = $props();

  // Summary values
  let loadFormatted = $derived(fmtPower(stats.loadServed));
  let unservedFormatted = $derived(fmtPower(stats.loadUnserved));

  // Generation sources
  let generationSources = $derived([
    { type: SubstationCategory.Nuclear, value: stats.nuclearGen, reserve: stats.reservesNuclear },
    { type: SubstationCategory.Thermal, value: stats.thermalGen, reserve: stats.reservesThermal },
    { type: SubstationCategory.Solar, value: stats.solarGen, reserve: stats.reservesSolar },
    { type: SubstationCategory.Wind, value: stats.windGen, reserve: stats.reservesWind },
  ]);

  let totalGeneration = $derived(stats.windGen + stats.solarGen + stats.thermalGen + stats.nuclearGen);
  let totalSystemCapacity = $derived(totalGeneration + stats.reserves);

  // Load mix
  let loadMix = $derived([
    { ...LoadTypeConfig[LoadCategoryType.Residential], value: stats.loadServedResidential },
    { ...LoadTypeConfig[LoadCategoryType.Commercial], value: stats.loadServedCommercial },
    { ...LoadTypeConfig[LoadCategoryType.Industrial], value: stats.loadServedIndustrial },
    { ...LoadTypeConfig[LoadCategoryType.Datacenter], value: stats.loadServedDatacenter },
  ]);

  function moneyStr(val: number): string {
    const [v, u] = fmtMoney(val);
    return v + u;
  }
</script>

{#snippet unit(v: string, u: string, hero?: boolean)}
  {v}{#if u}<span class={cn(hero ? 'text-[0.6em]' : 'text-[0.8em]', 'opacity-50 ml-[0.15em]')}>{u}</span>{/if}
{/snippet}

{#snippet statRow(label: string, value: string | [string, string])}
  <div class="flex justify-between items-baseline gap-2">
    <span class="text-sidebar-foreground/60 truncate">{label}</span>
    <span class={cn('text-sidebar-foreground', STAT_VALUE)}>
      {#if typeof value === 'string'}
        {value}
      {:else}
        {@render unit(value[0], value[1])}
      {/if}
    </span>
  </div>
{/snippet}

<div class="space-y-3">
  <!-- Generation Section -->
  <h4 class="text-sm font-bold uppercase tracking-wider text-muted-foreground border-b border-border/50 pb-1">Generation</h4>
  <div class="space-y-2">
    <div class="space-y-2">
      {#each generationSources as { type, value, reserve }, index}
        {@const config = GenerationTypeConfig[type]}
        {#if config}
          {@const capacity = value + reserve}
          {@const capacityPercentage = totalSystemCapacity > 0 ? (capacity / totalSystemCapacity) * 100 : 0}
          {@const actualPercentageOfCapacity = capacity > 0 ? (value / capacity) * 100 : 0}
          <div class="flex items-center gap-2">
            <config.icon class="h-4 w-4 {config.tailwind.text} flex-shrink-0" />
            <span id="gen-name-{index}" class="text-sm text-sidebar-foreground/50 w-[5rem] flex-shrink-0">{config.name}</span>
            <div
              class="h-3 flex-1 rounded-full bg-foreground/10"
              role="meter"
              aria-valuemin={0}
              aria-valuemax={capacity}
              aria-valuenow={value}
              aria-labelledby="gen-name-{index} gen-value-{index}"
              aria-describedby="gen-desc-{index}"
              title="Capacity: {capacity.toFixed(0)} MW"
            >
              <span id="gen-desc-{index}" class="sr-only">. Total capacity is {capacity.toFixed(0)} MW, with {reserve.toFixed(0)} MW in reserve.</span>
              <div class="h-3 flex rounded-full overflow-hidden" style="width: {capacityPercentage}%">
                <div
                  class={cn(config.tailwind.bg)}
                  style="width: {actualPercentageOfCapacity}%"
                  title="Current Output: {value.toFixed(0)} MW"
                ></div>
                <div
                  class={cn(config.tailwind.bg, 'opacity-30')}
                  style="width: {100 - actualPercentageOfCapacity}%"
                  title="Reserve Capacity: {reserve.toFixed(0)} MW"
                ></div>
              </div>
            </div>
            <span id="gen-value-{index}" class={cn('text-base w-20 text-right text-sidebar-foreground/70', STAT_VALUE)}>
              {@render unit(value.toFixed(0), 'MW')}
            </span>
          </div>
        {/if}
      {/each}
    </div>
  </div>

  <!-- Load Section -->
  <h4 class="text-sm font-bold uppercase tracking-wider text-muted-foreground border-b border-border/50 pb-1 mt-4">Load</h4>
  <div class="space-y-2">
    <div class="space-y-2">
      {#each loadMix as { name, value, icon: Icon, tailwind }, index}
        {@const barPercentage = stats.loadServed > 0 ? (value / stats.loadServed) * 100 : 0}
        <div class="flex items-center gap-2">
          <Icon class={cn('h-4 w-4 flex-shrink-0', tailwind.text)} />
          <span id="load-name-{index}" class="text-sm text-sidebar-foreground/50 w-[5rem] flex-shrink-0">{name}</span>
          <div
            class="h-3 flex-1 rounded-full bg-foreground/10"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={barPercentage}
            aria-labelledby="load-name-{index} load-value-{index}"
            title="{barPercentage.toFixed(1)}%"
          >
            <div class={cn('h-3 rounded-full', tailwind.bg)} style="width: {barPercentage}%"></div>
          </div>
          <span id="load-value-{index}" class={cn('text-base w-20 text-right text-sidebar-foreground/70', STAT_VALUE)}>
            {@render unit(value.toFixed(0), 'MW')}
          </span>
        </div>
      {/each}
    </div>
  </div>

  <!-- Summary Section -->
  <h4 class="text-sm font-bold uppercase tracking-wider text-muted-foreground border-b border-border/50 pb-1 mt-4">Summary</h4>
  <div
    class="grid gap-x-4 gap-y-0.5 text-sm"
    style="grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr))"
    role="group"
    aria-label="Summary statistics"
  >
    {@render statRow('Total Load', [loadFormatted[0], loadFormatted[1]])}
    {@render statRow('Total Cost', moneyStr(stats.totalCost))}
    {@render statRow('Unserved Load', [unservedFormatted[0], unservedFormatted[1]])}
    {@render statRow('Operating Cost', moneyStr(stats.totalOpCost))}
    {@render statRow('Unserved Cost', moneyStr(stats.totalUnservedCost))}
    {@render statRow('Fuel Cost', moneyStr(stats.totalFuelCost))}
    {@render statRow('Avg. Cost', `$${stats.avgCost.toFixed(2)}`)}
  </div>
</div>

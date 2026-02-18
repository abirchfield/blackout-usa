<script lang="ts">
  import type { StatsSnapshot } from '$lib/types';
  import { SubstationCategory, LoadCategoryType } from '$lib/types';
  import { GenerationTypeConfig, LoadTypeConfig, STAT_VALUE } from '$components/theme';
  import SectionLabel from '$components/ui/SectionLabel.svelte';
  import FormattedUnit from '$components/ui/FormattedUnit.svelte';
  import { cn, fmtPower, fmtMoney } from '$lib/utils';

  interface Props {
    stats: StatsSnapshot;
  }

  let { stats }: Props = $props();

  // Summary values
  let loadFormatted = $derived(fmtPower(stats.loadServed));
  let unservedFormatted = $derived(fmtPower(stats.loadUnserved));

  // Generation sources (capacity = total installed, weather-adjusted for renewables)
  let generationSources = $derived([
    { type: SubstationCategory.Nuclear, value: stats.nuclearGen, capacity: stats.capacityNuclear },
    { type: SubstationCategory.Thermal, value: stats.thermalGen, capacity: stats.capacityThermal },
    { type: SubstationCategory.Solar, value: stats.solarGen, capacity: stats.capacitySolar },
    { type: SubstationCategory.Wind, value: stats.windGen, capacity: stats.capacityWind },
  ]);

  // Load mix
  let loadMix = $derived([
    { ...LoadTypeConfig[LoadCategoryType.Residential], value: stats.loadServedResidential },
    { ...LoadTypeConfig[LoadCategoryType.Commercial], value: stats.loadServedCommercial },
    { ...LoadTypeConfig[LoadCategoryType.Industrial], value: stats.loadServedIndustrial },
    { ...LoadTypeConfig[LoadCategoryType.Datacenter], value: stats.loadServedDatacenter },
  ]);

  // Unified scale: max category value across both gen capacities and load values
  let globalMax = $derived(Math.max(
    ...generationSources.map(g => g.capacity),
    ...loadMix.map(l => l.value),
    1,
  ));

  function moneyStr(val: number): string {
    const [v, u] = fmtMoney(val);
    return v + u;
  }
</script>

{#snippet statRow(label: string, value: string | [string, string])}
  <div class="flex justify-between items-baseline gap-2">
    <span class="text-sidebar-foreground/60 truncate">{label}</span>
    <span class={cn('text-sidebar-foreground', STAT_VALUE)}>
      {#if typeof value === 'string'}
        {value}
      {:else}
        <FormattedUnit value={value[0]} unit={value[1]} />
      {/if}
    </span>
  </div>
{/snippet}

{#snippet barRow(Icon: typeof import('lucide-svelte').Atom, iconClass: string, nameId: string, name: string, valueId: string, descId: string | undefined, barBg: string, segments: {pct: number, title: string, dim?: boolean}[], value: number, ariaMax: number, ariaLabel: string, barTitle: string)}
  {@const totalPct = segments.reduce((a,s) => a + s.pct, 0)}
  <div class="flex items-center gap-1.5 sm:gap-2">
    <Icon class={cn('h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0', iconClass)} />
    <span id={nameId} class="text-xs sm:text-sm text-sidebar-foreground/50 w-16 sm:w-[5rem] flex-shrink-0 truncate">{name}</span>
    <div
      class="h-2.5 sm:h-3 flex-1 min-w-0 rounded-full bg-foreground/10"
      role="meter"
      aria-valuemin={0}
      aria-valuemax={ariaMax}
      aria-valuenow={value}
      aria-labelledby="{nameId} {valueId}"
      aria-describedby={descId}
      title={barTitle}
    >
      {#if descId}<span id={descId} class="sr-only">{ariaLabel}</span>{/if}
      <div class="h-full flex rounded-full overflow-hidden" style="width: {totalPct}%">
        {#each segments as seg}
          <div
            class={cn(barBg, seg.dim ? 'opacity-30' : '')}
            style="width: {totalPct > 0 ? (seg.pct / totalPct) * 100 : 0}%"
            title={seg.title}
          ></div>
        {/each}
      </div>
    </div>
    <span id={valueId} class={cn('text-sm sm:text-base w-16 sm:w-20 text-right text-sidebar-foreground/70 flex-shrink-0', STAT_VALUE)}>
      <FormattedUnit value={value.toFixed(0)} unit="MW" />
    </span>
  </div>
{/snippet}

<div class="space-y-3">
  <!-- Generation Section -->
  <SectionLabel variant="dashboard">Generation</SectionLabel>
  <div class="space-y-1.5 sm:space-y-2">
    {#each generationSources as { type, value, capacity }, index}
      {@const config = GenerationTypeConfig[type]}
      {#if config}
        {@const activePct = (value / globalMax) * 100}
        {@const unused = capacity - value}
        {@const unusedPct = (unused / globalMax) * 100}
        {@render barRow(
          config.icon,
          config.tailwind.text,
          `gen-name-${index}`,
          config.name,
          `gen-value-${index}`,
          `gen-desc-${index}`,
          config.tailwind.bg,
          [
            { pct: activePct, title: `Current Output: ${value.toFixed(0)} MW` },
            { pct: unusedPct, title: `Unused Capacity: ${unused.toFixed(0)} MW`, dim: true },
          ],
          value,
          capacity,
          `. Total capacity is ${capacity.toFixed(0)} MW, with ${unused.toFixed(0)} MW unused.`,
          `Capacity: ${capacity.toFixed(0)} MW`
        )}
      {/if}
    {/each}
  </div>

  <!-- Load Section -->
  <SectionLabel variant="dashboard" class="mt-4">Load</SectionLabel>
  <div class="space-y-1.5 sm:space-y-2">
    {#each loadMix as { name, value, icon: Icon, tailwind }, index}
      {@const barPct = (value / globalMax) * 100}
      {@render barRow(
        Icon,
        tailwind.text,
        `load-name-${index}`,
        name,
        `load-value-${index}`,
        undefined,
        tailwind.bg,
        [{ pct: barPct, title: `${value.toFixed(0)} MW` }],
        value,
        globalMax,
        '',
        `${value.toFixed(0)} MW`
      )}
    {/each}
  </div>

  <!-- Summary Section -->
  <SectionLabel variant="dashboard" class="mt-4">Summary</SectionLabel>
  <div
    class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 text-sm"
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

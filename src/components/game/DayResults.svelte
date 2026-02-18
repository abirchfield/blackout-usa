<script lang="ts">
  import Badge from '$components/ui/Badge.svelte';
  import SectionLabel from '$components/ui/SectionLabel.svelte';
  import UnitSuffix from '$components/ui/UnitSuffix.svelte';
  import { cn, fmtMoney } from '$lib/utils';
  import type { StatsSnapshot, ResultDetails } from '$lib/types';
  import { STAT_VALUE } from '$components/theme';

  interface Props {
    stats: StatsSnapshot;
    day: number;
    resultDetails: ResultDetails;
  }

  let { stats, day, resultDetails }: Props = $props();

  const performanceMap = {
    record: { title: 'Record Breaker', variant: 'default' as const },
    good: { title: 'Great Job', variant: 'secondary' as const },
    okay: { title: 'Not Bad', variant: 'outline' as const },
    bad: { title: 'Over Budget', variant: 'destructive' as const },
    blackout: { title: 'Blackout', variant: 'destructive' as const },
  };

  let performance = $derived(performanceMap[resultDetails.performance]);
</script>

<div class="space-y-4">
  <div class="flex items-center gap-3">
    <h4 class="font-bold leading-none text-2xl">Day {day} Results</h4>
    <Badge variant={performance.variant}>{performance.title}</Badge>
  </div>

  <div>
    <p class="text-sm text-muted-foreground">Total cost for your shift was</p>
    <div class={cn('text-3xl sm:text-4xl text-foreground', STAT_VALUE)}>
      ${resultDetails.costM}<UnitSuffix hero>M</UnitSuffix>
    </div>
    <p class="text-sm text-muted-foreground whitespace-pre-line mt-2">{resultDetails.message}</p>
  </div>

  <div class="border-t pt-3">
    <SectionLabel>Additional Stats</SectionLabel>
    <div class="grid grid-cols-2 gap-x-8 gap-y-0.5 text-sm" role="group" aria-label="Additional statistics">
      {@render statRow('Operating Cost', fmtMoney(stats.totalOpCost))}
      {@render statRow('Fuel Cost', fmtMoney(stats.totalFuelCost))}
      {@render statRow('Unserved Cost', fmtMoney(stats.totalUnservedCost))}
      {@render statRow('Avg. Cost', [`$${stats.avgCost.toFixed(2)}`, '/MWh'])}
    </div>
  </div>
</div>

{#snippet statRow(label: string, value: [string, string])}
  <div class="flex justify-between items-baseline gap-4">
    <span class="text-muted-foreground shrink-0">{label}</span>
    <span class={cn('text-foreground', STAT_VALUE)}>
      {value[0]}{#if value[1]}<UnitSuffix>{value[1]}</UnitSuffix>{/if}
    </span>
  </div>
{/snippet}

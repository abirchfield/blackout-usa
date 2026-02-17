<script lang="ts">
  import type { StatsSnapshot } from '$lib/types';
  import { UIThresholds, STAT_VALUE } from '$components/theme';
  import { cn, fmtPower } from '$lib/utils';

  interface Props {
    stats: StatsSnapshot;
    class?: string;
  }

  let { stats, class: className }: Props = $props();

  let genFormatted = $derived(fmtPower(stats.totalGeneration));
  let resFormatted = $derived(fmtPower(stats.reserves));
</script>

{#snippet unit(v: string, u: string, hero?: boolean)}
  {v}{#if u}<span class={cn(hero ? 'text-[0.6em]' : 'text-[0.8em]', 'opacity-50 ml-[0.15em]')}>{u}</span>{/if}
{/snippet}

<div class={cn('grid grid-cols-3 gap-4', className)} role="group" aria-label="Key game statistics">
  <div>
    <div id="freq-label" class="text-[0.65rem] text-sidebar-foreground/60 uppercase tracking-wider font-bold">Frequency</div>
    <div
      id="dash-freq"
      class={cn(
        'text-2xl sm:text-3xl',
        STAT_VALUE,
        stats.frequency < UIThresholds.FREQUENCY_WARNING_LOW || stats.frequency > UIThresholds.FREQUENCY_WARNING_HIGH
          ? 'text-destructive'
          : 'text-sidebar-foreground'
      )}
      aria-labelledby="freq-label"
    >
      {@render unit(stats.frequency.toFixed(2), 'Hz', true)}
    </div>
  </div>
  <div>
    <div id="tgen-label" class="text-[0.65rem] text-sidebar-foreground/60 uppercase tracking-wider font-bold">Total Gen.</div>
    <div id="dash-tgen" class={cn('text-2xl sm:text-3xl text-sidebar-foreground', STAT_VALUE)} aria-labelledby="tgen-label">
      {@render unit(genFormatted[0], genFormatted[1], true)}
    </div>
  </div>
  <div>
    <div id="reserve-label" class="text-[0.65rem] text-sidebar-foreground/60 uppercase tracking-wider font-bold">Reserves</div>
    <div
      id="dash-reserve"
      class={cn(
        'text-2xl sm:text-3xl',
        STAT_VALUE,
        stats.reserves < UIThresholds.RESERVES_CRITICAL_MW
          ? 'text-destructive'
          : stats.reserves < UIThresholds.RESERVES_WARNING_MW
            ? 'text-[var(--color-warning)]'
            : 'text-sidebar-foreground'
      )}
      aria-labelledby="reserve-label"
    >
      {@render unit(resFormatted[0], resFormatted[1], true)}
    </div>
  </div>
</div>

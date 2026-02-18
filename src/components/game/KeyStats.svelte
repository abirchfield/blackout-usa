<script lang="ts">
  import type { StatsSnapshot } from '$lib/types';
  import { UIThresholds, STAT_VALUE } from '$components/theme';
  import SectionLabel from '$components/ui/SectionLabel.svelte';
  import FormattedUnit from '$components/ui/FormattedUnit.svelte';
  import { cn, fmtPower } from '$lib/utils';

  interface Props {
    stats: StatsSnapshot;
    class?: string;
  }

  let { stats, class: className }: Props = $props();

  let genFormatted = $derived(fmtPower(stats.totalGeneration));
  let resFormatted = $derived(fmtPower(stats.reserves));
</script>

<div class={cn('grid grid-cols-3 gap-4', className)} role="group" aria-label="Key game statistics">
  <div>
    <SectionLabel variant="sidebar" id="freq-label">Frequency</SectionLabel>
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
      <FormattedUnit value={stats.frequency.toFixed(2)} unit="Hz" hero />
    </div>
  </div>
  <div>
    <SectionLabel variant="sidebar" id="tgen-label">Total Gen.</SectionLabel>
    <div id="dash-tgen" class={cn('text-2xl sm:text-3xl text-sidebar-foreground', STAT_VALUE)} aria-labelledby="tgen-label">
      <FormattedUnit value={genFormatted[0]} unit={genFormatted[1]} hero />
    </div>
  </div>
  <div>
    <SectionLabel variant="sidebar" id="reserve-label">Reserves</SectionLabel>
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
      <FormattedUnit value={resFormatted[0]} unit={resFormatted[1]} hero />
    </div>
  </div>
</div>

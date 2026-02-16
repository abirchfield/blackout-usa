<script lang="ts">
  import { UnitStatus, BranchStatus, SubstationCategory } from '$lib/types';
  import { StatusConfig } from '$components/theme';

  interface Props {
    status: UnitStatus | BranchStatus;
    category?: SubstationCategory | string;
    power?: number;
    pmax?: number;
    class?: string;
    title?: string;
  }

  let { status, category, power = 0, pmax = 1, class: className = 'w-3 h-3', title: defaultTitle }: Props = $props();

  let indicatorClassName = $derived.by(() => {
    if (category === SubstationCategory.Load) {
      switch (status) {
        case UnitStatus.IN: return 'bg-[var(--color-status-in)]';
        case UnitStatus.TRIP: return 'bg-[var(--color-status-trip)]';
        case UnitStatus.DIS:
        default: return 'border border-muted-foreground';
      }
    }
    const config = StatusConfig[status as UnitStatus] || StatusConfig[UnitStatus.DIS];
    return config.tailwind.bg;
  });

  let title = $derived.by(() => {
    if (defaultTitle) return defaultTitle;
    if (category === SubstationCategory.Load) {
      switch (status) {
        case UnitStatus.IN: return 'In-Service';
        case UnitStatus.TRIP: return 'Tripped';
        default: return 'Out-of-Service';
      }
    }
    const config = StatusConfig[status as UnitStatus] || StatusConfig[UnitStatus.DIS];
    if (status === UnitStatus.IN) return `In-Service (${power.toFixed(0)} MW)`;
    return config.label;
  });

  let indicatorStyle = $derived.by(() => {
    if (category !== SubstationCategory.Load && status === UnitStatus.IN) {
      const brightness = pmax > 0 ? power / pmax : 0;
      return `opacity: ${Math.max(0.2, brightness)}`;
    }
    return '';
  });
</script>

<div class="{className} {indicatorClassName} rounded-full transition-all" style={indicatorStyle} {title}></div>

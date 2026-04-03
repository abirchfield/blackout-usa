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

  let { status, category, power = 0, pmax = 1, class: className = 'w-3.5 h-3.5', title: defaultTitle }: Props = $props();

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

  let colorVar = $derived.by(() => {
    if (category === SubstationCategory.Load) {
      switch (status) {
        case UnitStatus.IN: return 'var(--color-status-in)';
        case UnitStatus.TRIP: return 'var(--color-status-trip)';
        default: return 'var(--color-status-dis)';
      }
    }
    switch (status) {
      case UnitStatus.IN:
      case BranchStatus.IN: return 'var(--color-status-in)';
      case UnitStatus.STARTUP: return 'var(--color-status-startup)';
      case UnitStatus.TRIP:
      case BranchStatus.TRIP: return 'var(--color-status-trip)';
      case UnitStatus.SHUTDOWN: return 'var(--color-status-dis)';
      default: return 'var(--color-status-dis)';
    }
  });

  let opacity = $derived.by(() => {
    if (category !== SubstationCategory.Load && (status === UnitStatus.IN || status === BranchStatus.IN)) {
      if (pmax > 0) return Math.max(0.2, power / pmax);
    }
    return 1;
  });

  // Shape:
  //   filled     = In-Service (solid circle)
  //   hollow     = Out-of-Service / Disconnected (ring)
  //   half-right = Starting Up (ring + right-half fill)
  //   half-left  = Shutting Down (ring + left-half fill)
  //   diamond    = Tripped (rotated square)
  type Shape = 'filled' | 'hollow' | 'half-right' | 'half-left' | 'diamond';
  let shape: Shape = $derived.by(() => {
    switch (status) {
      case UnitStatus.IN:
      case BranchStatus.IN: return 'filled';
      case UnitStatus.DIS:
      case BranchStatus.DIS: return 'hollow';
      case UnitStatus.STARTUP: return 'half-right';
      case UnitStatus.SHUTDOWN: return 'half-left';
      case UnitStatus.TRIP:
      case BranchStatus.TRIP: return 'diamond';
      default: return 'hollow';
    }
  });

  let isPulsing = $derived(status === UnitStatus.STARTUP);
</script>

<!--
  Shape legend (non-color cues for WCAG 1.4.1):
    ● filled circle  → In-Service
    ○ hollow ring    → Out-of-Service
    ◑ right-half     → Starting Up
    ◐ left-half      → Shutting Down
    ◆ diamond        → Tripped
-->
<svg
  class="{className} {isPulsing ? 'animate-pulse' : ''} transition-all"
  viewBox="0 0 12 12"
  style="opacity: {opacity}"
  aria-hidden="true"
>
  <title>{title}</title>
  {#if shape === 'filled'}
    <circle cx="6" cy="6" r="5" fill={colorVar} />
  {:else if shape === 'hollow'}
    <circle cx="6" cy="6" r="4" fill="none" stroke={colorVar} stroke-width="2" />
  {:else if shape === 'half-right'}
    <!-- Ring + right semicircle fill (arc path avoids clipPath ID collisions) -->
    <circle cx="6" cy="6" r="4" fill="none" stroke={colorVar} stroke-width="2" />
    <path d="M6,2 A4,4 0 0,1 6,10 Z" fill={colorVar} />
  {:else if shape === 'half-left'}
    <!-- Ring + left semicircle fill -->
    <circle cx="6" cy="6" r="4" fill="none" stroke={colorVar} stroke-width="2" />
    <path d="M6,2 A4,4 0 0,0 6,10 Z" fill={colorVar} />
  {:else if shape === 'diamond'}
    <rect x="2" y="2" width="8" height="8" rx="1" fill={colorVar} transform="rotate(45 6 6)" />
  {/if}
</svg>

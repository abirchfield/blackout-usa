<script lang="ts">
  import CircuitTable from '$components/tables/CircuitTable.svelte';
  import type { Branch } from '$lib/types';
  import { BranchStatus } from '$lib/types';

  const RAMP_RATE = 30;
  const RAMP_TICK_MS = 100;
  const TARGET_FLOW = 450;

  const mockBranch: Branch = {
    Number: '0',
    FromNum: '1',
    ToNum: '2',
    fromIdx: 0,
    toIdx: 1,
    FromSub: 'Example A',
    ToSub: 'Example B',
    Status: BranchStatus.IN,
    P: 450,
    Pmax: 500,
    Z: 0.01,
    ybr: -100,
  };

  let circuitBranch: Branch = $state({ ...mockBranch });

  // Ramp flow toward target
  $effect(() => {
    const target = circuitBranch.Status === BranchStatus.IN ? TARGET_FLOW : 0;
    if (Math.abs(circuitBranch.P - target) < 0.5) return;
    const id = setInterval(() => {
      const t = circuitBranch.Status === BranchStatus.IN ? TARGET_FLOW : 0;
      if (Math.abs(circuitBranch.P - t) < 0.5) {
        circuitBranch = { ...circuitBranch, P: t };
        return;
      }
      const step = Math.min(Math.abs(t - circuitBranch.P), RAMP_RATE);
      circuitBranch = { ...circuitBranch, P: +(circuitBranch.P + Math.sign(t - circuitBranch.P) * step).toFixed(1) };
    }, RAMP_TICK_MS);
    return () => clearInterval(id);
  });

  function handleCircuitAction(_branchId: string) {
    if (circuitBranch.Status === BranchStatus.IN) {
      circuitBranch = { ...circuitBranch, Status: BranchStatus.DIS };
    } else if (circuitBranch.Status === BranchStatus.DIS) {
      circuitBranch = { ...circuitBranch, Status: BranchStatus.IN };
    }
  }
</script>

{#snippet lineExample(status: 'normal' | 'overloaded' | 'critical' | 'tripped' | 'out', label: string, showFlow?: boolean)}
  {@const styles = {
    normal: { stroke: 'var(--foreground)', dasharray: 'none' },
    overloaded: { stroke: 'var(--color-warning)', dasharray: 'none' },
    critical: { stroke: 'var(--color-overload-critical)', dasharray: '8,4' },
    tripped: { stroke: 'var(--color-tripped)', dasharray: '5,5' },
    out: { stroke: 'var(--foreground)', dasharray: '5,5' },
  }}
  {@const style = styles[status]}
  <div class="flex flex-col items-center gap-1.5 min-w-[80px]">
    <div class="w-16 h-6 flex items-center justify-center">
      <svg width="100%" height="6" viewBox="0 0 64 6" class="overflow-visible">
        <line
          x1="0" y1="3" x2="64" y2="3"
          stroke={style.stroke}
          stroke-width="3"
          stroke-dasharray={style.dasharray}
          stroke-linecap="round"
        />
        {#if showFlow && status === 'normal'}
          <circle cx="16" cy="3" r="2.5" fill="var(--color-power-flow)" />
          <circle cx="32" cy="3" r="2.5" fill="var(--color-power-flow)" />
          <circle cx="48" cy="3" r="2.5" fill="var(--color-power-flow)" />
        {/if}
      </svg>
    </div>
    <p class="text-xs font-medium text-center">{label}</p>
  </div>
{/snippet}

<div class="space-y-4">
  <div>
    <h5 class="text-[0.65rem] text-muted-foreground uppercase tracking-wider font-bold mb-2">Line Appearance on Map</h5>
    <p class="text-xs text-muted-foreground mb-2">
      Power flows automatically based on physics. Lines have a capacity rating &mdash; if exceeded, they can trip.
    </p>
    <div class="flex flex-wrap gap-4 justify-center">
      {@render lineExample('normal', 'Normal', true)}
      {@render lineExample('overloaded', 'Overloaded')}
      {@render lineExample('critical', 'Critical')}
      {@render lineExample('tripped', 'Tripped')}
      {@render lineExample('out', 'Out-of-Service')}
    </div>
    <p class="text-xs text-muted-foreground text-center mt-2">
      Above 100%: yellow. Above 120%: red with dashing. Tripped: disconnected.
    </p>
  </div>

  <div class="border-t pt-3">
    <h5 class="text-[0.65rem] text-muted-foreground uppercase tracking-wider font-bold mb-2">Interactive Demo</h5>
    <p class="text-xs text-muted-foreground mb-2">
      Click the button to open or close the line. Watch flow and loading update in real time.
    </p>
    <div class="border rounded-lg overflow-hidden bg-background/50">
      <CircuitTable
        branch={circuitBranch}
        onBranchAction={handleCircuitAction}
      />
    </div>
  </div>

  <div class="rounded-lg bg-destructive/10 border border-destructive/30 p-3">
    <p class="text-sm">
      <span class="font-semibold">Cascading failures</span> <span class="text-muted-foreground">&mdash; When a line trips, its power redistributes to other lines.
      This can push them over capacity too, a chain reaction that can black out entire regions.</span>
    </p>
  </div>
</div>

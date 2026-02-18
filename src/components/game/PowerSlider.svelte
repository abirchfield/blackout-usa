<script lang="ts">
  import Slider from '$components/ui/Slider.svelte';
  import ProgressBar from '$components/ui/ProgressBar.svelte';
  import { cn } from '$lib/utils';

  interface Props {
    setpoint: number;
    actual: number;
    pmax: number;
    onValueChange?: (newValue: number) => void;
    onValueCommit?: (newValue: number) => void;
    disabled: boolean;
  }

  let { setpoint, actual, pmax, onValueChange, onValueCommit, disabled }: Props = $props();

  let outputPercentage = $derived(pmax > 0 ? (actual / pmax) * 100 : 0);
</script>

<div class={cn("w-full flex items-center gap-2", disabled && "opacity-75")}>
  <div class="relative flex-1 h-6 flex items-center">
    <!-- Actual output bar - shown underneath -->
    <div
      class="absolute inset-y-0 left-0 flex items-center w-full pointer-events-none"
      title={`Actual Output: ${actual.toFixed(0)} MW`}
    >
      <ProgressBar value={outputPercentage} height="sm" colorClass="bg-primary/70" />
    </div>
    <!-- Slider control - on top with higher z-index -->
    <div class="relative z-10 w-full">
      <Slider
        value={setpoint}
        {onValueChange}
        {onValueCommit}
        min={0}
        max={pmax}
        step={1}
        {disabled}
        aria-label={`Setpoint: ${setpoint.toFixed(0)} MW, Actual: ${actual.toFixed(0)} MW`}
        class="power-slider"
      />
    </div>
  </div>
  <!-- Numeric setpoint display -->
  <span class="text-xs font-mono text-muted-foreground w-12 text-right tabular-nums">
    {setpoint.toFixed(0)} MW
  </span>
</div>

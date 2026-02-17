<script lang="ts" module>
  export interface ColumnConfig {
    unit?: boolean;
    status?: boolean;
    output?: boolean;
    actual?: boolean;
    time?: boolean;
    action?: boolean;
  }
</script>

<script lang="ts">
  import { Timer } from 'lucide-svelte';
  import { cn } from '$lib/utils';
  import type { Substation } from '$lib/types';
  import GeneratorUnitDetails from './GeneratorUnitDetails.svelte';
  import type { ColumnConfig as CC } from './UnitTable.svelte';

  interface Props {
    sub: Substation;
    onUnitAction: (subId: string, unitIndex: number) => void;
    onAbortTransition?: (subId: string, unitIndex: number) => void;
    onSetSetpoint: (subId: string, unitIndex: number, newSetpoint: number) => void;
    setpoints: Record<number, number>;
    onSetpointChange: (index: number, value: number) => void;
    isPaused?: boolean;
    stickyHeader?: boolean;
    columnConfig?: CC;
  }

  let {
    sub,
    onUnitAction,
    onAbortTransition,
    onSetSetpoint,
    setpoints,
    onSetpointChange,
    isPaused,
    stickyHeader = false,
    columnConfig: rawColumnConfig,
  }: Props = $props();

  const defaultColumnConfig: Required<CC> = {
    unit: true,
    status: true,
    output: true,
    actual: true,
    time: true,
    action: true,
  };

  let cols = $derived({ ...defaultColumnConfig, ...rawColumnConfig });
</script>

<table class="w-full text-sm table-fixed" aria-label="Generator units">
  <thead class={cn("text-xs text-muted-foreground", stickyHeader && "sticky top-0 bg-background z-10")}>
    <tr class="border-b border-border/50">
      {#if cols.unit}
        <th scope="col" class="p-2 text-center font-semibold w-[6%]">#</th>
      {/if}
      {#if cols.status}
        <th scope="col" class="p-2 text-center font-semibold w-[8%]">Status</th>
      {/if}
      {#if cols.output}
        <th scope="col" class="p-2 text-left font-semibold w-[46%]">Setpoint</th>
      {/if}
      {#if cols.actual}
        <th scope="col" class="p-2 text-right font-semibold w-[16%]">Output</th>
      {/if}
      {#if cols.time}
        <th scope="col" class="p-2 text-right font-semibold w-[12%]">
          <Timer class="h-4 w-4 inline" role="img" aria-label="Time to change state" />
        </th>
      {/if}
      {#if cols.action}
        <th scope="col" class="p-2 text-center font-semibold w-[12%]">Action</th>
      {/if}
    </tr>
  </thead>
  <tbody>
    {#each sub.U as unit, index (index)}
      <GeneratorUnitDetails
        {sub}
        {unit}
        {index}
        {onUnitAction}
        {onAbortTransition}
        {onSetSetpoint}
        setpointValue={setpoints[index] ?? 0}
        {onSetpointChange}
        {isPaused}
        columnConfig={cols}
      />
    {/each}
  </tbody>
</table>

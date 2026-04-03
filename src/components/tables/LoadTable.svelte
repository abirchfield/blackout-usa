<script lang="ts">
  import { cn } from '$lib/utils';
  import type { Substation, Unit } from '$lib/types';
  import LoadUnitDetails from './LoadUnitDetails.svelte';

  interface Props {
    sub: Substation;
    units?: Unit[];
    onUnitAction: (subId: string, unitIndex: number) => void;
    isPaused?: boolean;
    stickyHeader?: boolean;
  }

  let {
    sub,
    units,
    onUnitAction,
    isPaused,
    stickyHeader = false,
  }: Props = $props();

  let loadUnits = $derived(units ?? sub.U);
</script>

<table class="w-full text-sm table-fixed">
  <caption class="sr-only">Load circuits for {sub.Name} substation</caption>
  <thead class={cn("text-xs text-muted-foreground", stickyHeader && "sticky top-0 bg-background z-10")}>
    <tr class="border-b border-border/50">
      <th scope="col" class="p-2 text-center font-semibold w-[8%]">#</th>
      <th scope="col" class="p-2 text-left font-semibold w-[25%]">Type</th>
      <th scope="col" class="p-2 text-center font-semibold w-[12%]">Status</th>
      <th scope="col" class="p-2 text-right font-semibold w-[15%]">Load</th>
      <th scope="col" class="p-2 text-left font-semibold w-[28%]">Loading</th>
      <th scope="col" class="p-2 text-center font-semibold w-[12%]">Action</th>
    </tr>
  </thead>
  <tbody>
    {#each loadUnits as unit, index (index)}
      <LoadUnitDetails
        {sub}
        {unit}
        {index}
        {onUnitAction}
        {isPaused}
      />
    {/each}
  </tbody>
</table>

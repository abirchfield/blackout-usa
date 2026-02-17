<script lang="ts">
  import Button from '$components/ui/Button.svelte';
  import { Power } from 'lucide-svelte';
  import { cn } from '$lib/utils';
  import type { Substation, Unit } from '$lib/types';
  import { UnitStatus, LoadCategoryType } from '$lib/types';
  import { LoadTypeConfig, StatusConfig } from '$components/theme';

  interface Props {
    sub: Substation;
    unit: Unit;
    index: number;
    onUnitAction: (subId: string, unitIndex: number) => void;
    isPaused?: boolean;
  }

  let { sub, unit, index, onUnitAction, isPaused }: Props = $props();

  let config = $derived(StatusConfig[unit.Status]);
  let category = $derived(unit.LoadCategory ?? LoadCategoryType.Residential);
  let typeConfig = $derived(LoadTypeConfig[category]);
</script>

<tr class="border-t border-border/50 align-middle" aria-labelledby={`load-circuit-header-${sub.Number}-${index}`}>
  <th scope="row" id={`load-circuit-header-${sub.Number}-${index}`} class="p-2 align-middle font-bold text-center">
    {index + 1}
  </th>
  <td class="p-2 align-middle text-left">
    <typeConfig.icon aria-hidden="true" class={cn("h-4 w-4 inline-block mr-2 align-middle", typeConfig.tailwind.text)} />
    <span class="align-middle">{typeConfig.name}</span>
  </td>
  <td class="p-2 align-middle text-center">
    {#if config}
      <span title={config.label}><config.icon role="img" aria-label={config.label} class={cn("h-5 w-5 mx-auto", config.tailwind.text)} /></span>
    {/if}
  </td>
  <td class="p-2 font-mono align-middle text-right">
    {#if unit.Status === UnitStatus.IN}
      {unit.P.toFixed(0)}<span class="text-xs text-muted-foreground ml-1">MW</span>
    {:else}
      ---
    {/if}
  </td>
  <td class="p-2 align-middle">
    {#if unit.Status === UnitStatus.IN && unit.Pmax > 0}
      {@const loadPercent = (unit.P / unit.Pmax) * 100}
      <div class="flex items-center gap-2">
        <div
          role="progressbar"
          aria-valuenow={loadPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Circuit ${index + 1} loading: ${loadPercent.toFixed(0)}%`}
          title={`Loading: ${loadPercent.toFixed(0)}%`}
          class="h-2 w-full rounded-full bg-muted overflow-hidden"
        >
          <div class={cn("h-full rounded-full transition-all", typeConfig.tailwind.bg)} style="width: {Math.min(100, loadPercent)}%"></div>
        </div>
        <span class="text-xs font-mono text-muted-foreground w-8 text-right" aria-hidden="true">{loadPercent.toFixed(0)}%</span>
      </div>
    {:else}
      <span class="text-xs text-muted-foreground">---</span>
    {/if}
  </td>
  <td class="p-2 align-middle text-center">
    {#if unit.Status === UnitStatus.IN}
      <Button variant="destructive" size="icon" onclick={() => onUnitAction(sub.Number, index)} disabled={isPaused} aria-label={`Disconnect Circuit ${index + 1}`}>
        <Power class="h-5 w-5" />
      </Button>
    {:else if unit.Status === UnitStatus.DIS}
      <Button variant="secondary" size="icon" onclick={() => onUnitAction(sub.Number, index)} disabled={isPaused} aria-label={`Connect Circuit ${index + 1}`}>
        <Power class="h-5 w-5" />
      </Button>
    {:else}
      <Button variant="ghost" size="icon" disabled={true} aria-label="Action unavailable">
        <span class="w-5 h-5"></span>
      </Button>
    {/if}
  </td>
</tr>

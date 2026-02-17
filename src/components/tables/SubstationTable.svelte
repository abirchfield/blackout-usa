<script lang="ts">
  import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '$components/ui/table';
  import Button from '$components/ui/Button.svelte';
  import StatusIndicator from '$components/tables/StatusIndicator.svelte';
  import GenerationTypeIcon from '$components/tables/GenerationTypeIcon.svelte';
  import type { Substation } from '$lib/types';
  import { SubstationCategory } from '$lib/types';

  interface Props {
    subs?: Record<string, Substation>;
    onSubstationSelect: (sub: Substation) => void;
  }

  let { subs, onSubstationSelect }: Props = $props();

  let sortedSubs = $derived.by(() => {
    if (!subs) return [];
    return Object.values(subs).sort((a, b) => a.Name.localeCompare(b.Name));
  });
</script>

<div>
  <Table>
    <caption class="sr-only">A sortable list of all substations in the grid. Select a substation to view its details.</caption>
    <TableHeader>
      <TableRow>
        <TableHead scope="col" class="w-[40%] min-w-[140px] text-muted-foreground">Substation</TableHead>
        <TableHead scope="col" class="w-[35%] min-w-[120px] text-muted-foreground">Status</TableHead>
        <TableHead scope="col" class="w-[25%] min-w-[100px] text-right text-muted-foreground">Power</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {#if sortedSubs.length > 0}
        {#each sortedSubs as sub (sub.Number)}
          {@const totalPower = sub.U.reduce((acc, unit) => acc + unit.P, 0)}
          <TableRow>
            <TableHead scope="row" class="font-medium text-xs py-2 truncate pr-4 text-foreground">
              <Button
                variant="link"
                onclick={() => onSubstationSelect(sub)}
                class="p-0 h-auto text-foreground text-xs font-medium justify-start text-left"
              >
                {sub.Name}
              </Button>
            </TableHead>
            <TableCell class="py-2 pr-2">
              <div class="flex items-center gap-1 flex-wrap">
                {#if sub.isLoad}
                  {#each sub.U as unit, index (index)}
                    {@const title = `Circuit #${index + 1}: ${unit.Status}`}
                    <span role="img" aria-label={title}>
                      <StatusIndicator status={unit.Status} category={SubstationCategory.Load} class="w-2.5 h-2.5" {title} />
                    </span>
                  {/each}
                {:else}
                  {#each sub.U as unit, index (index)}
                    {@const title = `Unit #${index + 1}: ${unit.Status} - ${unit.P.toFixed(0)} MW`}
                    <span role="img" aria-label={title}>
                      <StatusIndicator status={unit.Status} power={unit.P} pmax={unit.Pmax} class="w-2.5 h-2.5" {title} />
                    </span>
                  {/each}
                  {#if sub.Loads?.U}
                    {#each sub.Loads.U as unit, index (index)}
                      {@const title = `Load #${index + 1}: ${unit.Status}`}
                      <span role="img" aria-label={title}>
                        <StatusIndicator status={unit.Status} category={SubstationCategory.Load} class="w-2.5 h-2.5" {title} />
                      </span>
                    {/each}
                  {/if}
                {/if}
              </div>
            </TableCell>
            <TableCell class="text-right text-xs py-2 text-foreground whitespace-nowrap">
              <div class="flex items-center justify-end gap-1.5">
                <span>{totalPower.toFixed(0)} MW</span>
                <span class="sr-only">{sub.Category}</span>
                <GenerationTypeIcon category={sub.Category} class="w-3.5 h-3.5" aria-hidden="true" />
              </div>
            </TableCell>
          </TableRow>
        {/each}
      {:else}
        <TableRow>
          <TableCell colspan={3} class="h-24 text-center text-muted-foreground">
            No substations to show.
          </TableCell>
        </TableRow>
      {/if}
    </TableBody>
  </Table>
</div>

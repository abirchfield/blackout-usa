<script lang="ts">
  import Table from '$components/ui/Table.svelte';
  import TableHeader from '$components/ui/TableHeader.svelte';
  import TableBody from '$components/ui/TableBody.svelte';
  import TableRow from '$components/ui/TableRow.svelte';
  import TableHead from '$components/ui/TableHead.svelte';
  import TableCell from '$components/ui/TableCell.svelte';
  import Button from '$components/ui/Button.svelte';
  import type { Branch } from '$lib/types';
  import { BranchStatus } from '$lib/types';
  import { branchLoading, getLoadingBarColor, isBranchActive } from '$lib/utils';

  interface Props {
    branches?: Record<string, Branch>;
    onBranchSelect: (branch: Branch) => void;
  }

  let { branches, onBranchSelect }: Props = $props();

  function getBranchIndicator(branch: Branch) {
    const loading = branchLoading(branch);

    if (branch.Status === BranchStatus.TRIP) {
      return { className: 'bg-destructive w-2.5 h-2.5 rounded-full', title: 'Tripped' };
    }

    if (!isBranchActive(branch)) {
      return { className: 'border border-muted-foreground w-2.5 h-2.5 rounded-full', title: 'Out-of-Service' };
    }

    if (loading > 100) {
      return { className: 'bg-[var(--color-warning)] w-2.5 h-2.5 rounded-full', title: `Overloaded: ${loading.toFixed(0)}%` };
    }

    return { className: 'bg-[var(--color-status-in)] w-2.5 h-2.5 rounded-full', title: `In-Service: ${loading.toFixed(0)}%` };
  }

  let sortedBranches = $derived.by(() => {
    if (!branches) return [];
    return Object.values(branches)
      .sort((a, b) => `${a.sub1?.Name}-${a.sub2?.Name}`.localeCompare(`${b.sub1?.Name}-${b.sub2?.Name}`));
  });
</script>

<div>
  <Table>
    <caption class="sr-only">A sortable list of all transmission lines in the grid. Select a line to view its details.</caption>
    <TableHeader>
      <TableRow>
        <TableHead scope="col" class="w-[60%] min-w-[180px] text-muted-foreground">Line</TableHead>
        <TableHead scope="col" class="w-[40%] min-w-[140px] text-right text-muted-foreground">State</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {#if sortedBranches.length > 0}
        {#each sortedBranches as branch (branch.Number)}
          {@const loading = branchLoading(branch)}
          {@const active = isBranchActive(branch)}
          {@const indicator = getBranchIndicator(branch)}
          {@const barColor = getLoadingBarColor(loading)}
          <TableRow>
            <TableHead scope="row" class="font-medium text-xs py-2 truncate pr-4 text-foreground">
              <Button
                variant="link"
                onclick={() => onBranchSelect(branch)}
                class="p-0 h-auto text-foreground text-xs font-medium justify-start text-left"
              >
                {branch.sub1?.Name} - {branch.sub2?.Name}
              </Button>
            </TableHead>
            <TableCell class="py-2 text-right">
              <div class="flex items-center justify-end gap-2">
                <div role="img" aria-label={indicator.title} class={indicator.className} title={indicator.title}></div>
                {#if active}
                  <div
                    role="progressbar"
                    aria-valuenow={loading}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Line loading: ${loading.toFixed(0)}%`}
                    title={`Loading: ${loading.toFixed(0)}%`}
                    class="h-1.5 w-16 rounded-full bg-muted"
                  >
                    <div class="h-1.5 rounded-full {barColor} transition-all" style="width: {Math.min(100, loading)}%"></div>
                  </div>
                  <span class="text-xs font-mono w-8 text-right text-foreground" aria-hidden="true">{loading.toFixed(0)}%</span>
                {/if}
              </div>
            </TableCell>
          </TableRow>
        {/each}
      {:else}
        <TableRow>
          <TableCell colspan={2} class="h-24 text-center text-muted-foreground">
            No lines to show.
          </TableCell>
        </TableRow>
      {/if}
    </TableBody>
  </Table>
</div>

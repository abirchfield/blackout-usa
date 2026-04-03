<script lang="ts">
  import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '$components/ui/table';
  import Button from '$components/ui/Button.svelte';
  import ProgressBar from '$components/ui/ProgressBar.svelte';
  import StatusIndicator from '$components/tables/StatusIndicator.svelte';
  import type { Branch } from '$lib/types';
  import { BranchStatus } from '$lib/types';
  import { branchLoading, getLoadingBarColor, isBranchActive } from '$lib/utils';

  interface Props {
    branches?: Record<string, Branch>;
    onBranchSelect: (branch: Branch) => void;
  }

  let { branches, onBranchSelect }: Props = $props();

  let sortedBranches = $derived.by(() => {
    if (!branches) return [];
    return Object.values(branches)
      .sort((a, b) => `${a.sub1?.Name}-${a.sub2?.Name}`.localeCompare(`${b.sub1?.Name}-${b.sub2?.Name}`));
  });
</script>

<div class="overflow-x-auto">
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
          {@const barColor = getLoadingBarColor(loading)}
          {@const statusTitle = branch.Status === BranchStatus.TRIP ? 'Tripped' : !active ? 'Out-of-Service' : loading > 100 ? `Overloaded: ${loading.toFixed(0)}%` : `In-Service: ${loading.toFixed(0)}%`}
          <TableRow>
            <TableHead scope="row" class="font-medium text-xs py-2 truncate pr-4 text-foreground">
              <Button
                variant="link"
                onclick={() => onBranchSelect(branch)}
                class="px-0 py-1 min-h-11 text-foreground text-xs font-medium justify-start text-left"
              >
                {branch.sub1?.Name} - {branch.sub2?.Name}
              </Button>
            </TableHead>
            <TableCell class="py-2 text-right">
              <div class="flex items-center justify-end gap-2">
                <span role="img" aria-label={statusTitle}>
                  <StatusIndicator status={branch.Status} class="w-3 h-3" title={statusTitle} />
                </span>
                {#if active}
                  <ProgressBar value={loading} height="sm" colorClass={barColor} label={`Line loading: ${loading.toFixed(0)}%`} class="w-16" />
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

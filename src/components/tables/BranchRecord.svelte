<script lang="ts">
  import { branchLoading, getLoadingBarColor } from '$lib/utils';
  import Button from '$components/ui/Button.svelte';
  import ProgressBar from '$components/ui/ProgressBar.svelte';
  import StatusIndicator from '$components/tables/StatusIndicator.svelte';
  import { settings } from '$lib/stores/settings.svelte';
  import type { Branch } from '$lib/types';
  import { BranchStatus } from '$lib/types';

  interface Props {
    branch: Branch;
    label: string;
    onBranchAction: (branchId: string) => void;
    isPaused?: boolean;
  }

  let { branch, label, onBranchAction, isPaused }: Props = $props();

  let flow = $derived(branch.Status === BranchStatus.IN ? branch.P : 0);
  let loading = $derived(branchLoading(branch));

  let statusText = $derived.by(() => {
    switch (branch.Status) {
      case BranchStatus.IN: return "In-Service";
      case BranchStatus.DIS: return "Out-of-Service";
      case BranchStatus.TRIP: return "Tripped";
      default: return `Unknown (${branch.Status})`;
    }
  });

  let buttonText = $derived.by(() => {
    switch (branch.Status) {
      case BranchStatus.IN: return "Open";
      case BranchStatus.DIS: return "Close";
      default: return null;
    }
  });

  let buttonDisabled = $derived(branch.Status === BranchStatus.TRIP);

  let barColor = $derived(getLoadingBarColor(loading));
</script>

<tr data-slot="table-row" class="hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors" aria-labelledby={`branch-header-${branch.Number}`}>
  <th scope="row" id={`branch-header-${branch.Number}`} class="font-medium text-center p-2">{label}</th>
  <td data-slot="table-cell" class="p-2 align-middle whitespace-nowrap">
    <div class="flex items-center gap-2">
      <StatusIndicator status={branch.Status} />
      <span>{statusText}</span>
    </div>
  </td>
  <td data-slot="table-cell" class="p-2 align-middle whitespace-nowrap text-right font-mono">{Math.abs(flow).toFixed(0)} MW</td>
  <td data-slot="table-cell" class="p-2 align-middle whitespace-nowrap text-right font-mono">{branch.Pmax.toFixed(0)} MW</td>
  <td data-slot="table-cell" class="p-2 align-middle whitespace-nowrap">
    <div class="flex items-center gap-2" title={`Loading: ${loading.toFixed(0)}%`} aria-label={`Branch loading: ${loading.toFixed(0)}%`}>
      <ProgressBar value={loading} colorClass={barColor} label="Branch loading progress bar" />
      <span class="text-xs font-mono text-right">{loading.toFixed(0)}%</span>
    </div>
  </td>
  <td data-slot="table-cell" class="p-2 align-middle whitespace-nowrap">
    {#if buttonText}
      <Button
        variant={branch.Status === BranchStatus.IN ? "destructive" : settings.hcVariant}
        size="sm"
        onclick={() => onBranchAction(branch.Number)}
        disabled={buttonDisabled || isPaused}
      >
        {buttonText}
      </Button>
    {/if}
  </td>
</tr>

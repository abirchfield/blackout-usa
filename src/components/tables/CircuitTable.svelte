<script lang="ts">
  import Table from '$components/ui/Table.svelte';
  import TableHeader from '$components/ui/TableHeader.svelte';
  import TableBody from '$components/ui/TableBody.svelte';
  import TableRow from '$components/ui/TableRow.svelte';
  import TableHead from '$components/ui/TableHead.svelte';
  import BranchRecord from './BranchRecord.svelte';
  import type { Branch } from '$lib/types';

  interface Props {
    branch: Branch;
    sibling?: Branch;
    onBranchAction: (branchId: string) => void;
    isPaused?: boolean;
    isHighContrast?: boolean;
  }

  let { branch, sibling, onBranchAction, isPaused, isHighContrast }: Props = $props();
</script>

<Table class="w-full table-fixed">
  <caption class="sr-only">Details for each circuit in the transmission line.</caption>
  <TableHeader>
    <TableRow>
      <TableHead scope="col" class="text-center w-[10%]">#</TableHead>
      <TableHead scope="col" class="w-[25%]">Status</TableHead>
      <TableHead scope="col" class="text-right w-[15%]">Flow</TableHead>
      <TableHead scope="col" class="text-right w-[15%]">Rating</TableHead>
      <TableHead scope="col" class="w-[25%]">Loading</TableHead>
      <TableHead scope="col" class="w-[10%]">Action</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <BranchRecord {branch} label="1" {onBranchAction} {isPaused} {isHighContrast} />
    {#if sibling}
      <BranchRecord branch={sibling} label="2" {onBranchAction} {isPaused} {isHighContrast} />
    {/if}
  </TableBody>
</Table>

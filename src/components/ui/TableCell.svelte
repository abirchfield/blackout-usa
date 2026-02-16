<script lang="ts">
  import { cn } from '$lib/utils';
  import type { Snippet } from 'svelte';

  let { class: className, children, ...rest }: { class?: string; children: Snippet; [key: string]: unknown } = $props();
</script>

<td data-slot="table-cell" class={cn('p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]', className)} {...rest}>
  {@render children()}
</td>

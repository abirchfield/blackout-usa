<script lang="ts">
  import { cn } from '$lib/utils';
  import type { Snippet } from 'svelte';

  let { class: className, children, ...rest }: { class?: string; children: Snippet; [key: string]: unknown } = $props();
</script>

<th data-slot="table-head" class={cn("text-foreground h-10 px-2 text-left align-middle font-medium whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]", className)} {...rest}>
  {@render children()}
</th>

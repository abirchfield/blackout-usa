<script lang="ts">
  import { cn } from '$lib/utils';
  import type { Snippet } from 'svelte';

  let { class: className, children, ...rest }: { class?: string; children: Snippet; [key: string]: unknown } = $props();
</script>

<tr data-slot="table-row" class={cn('hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors', className)} {...rest}>
  {@render children()}
</tr>

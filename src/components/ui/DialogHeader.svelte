<script lang="ts">
  import { cn } from '$lib/utils';
  import type { Snippet } from 'svelte';

  let { class: className, children, ...rest }: { class?: string; children: Snippet; [key: string]: unknown } = $props();
</script>

<div data-slot="dialog-header" class={cn('flex flex-col gap-2 text-center sm:text-left', className)} {...rest}>
  {@render children()}
</div>

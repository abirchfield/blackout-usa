<script lang="ts">
  import { Dialog } from 'bits-ui';
  import { cn } from '$lib/utils';
  import type { Snippet } from 'svelte';

  let { class: className, children, ...rest }: { class?: string; children: Snippet; [key: string]: unknown } = $props();
</script>

<Dialog.Description data-slot="dialog-description" class={cn('text-muted-foreground text-sm', className)} {...rest}>
  {@render children()}
</Dialog.Description>

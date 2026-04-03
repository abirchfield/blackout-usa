<script lang="ts">
  import { Select } from 'bits-ui';
  import { cn } from '$lib/utils';
  import type { Snippet } from 'svelte';

  interface Props {
    class?: string;
    children: Snippet;
    [key: string]: unknown;
  }

  let { class: className, children, ...rest }: Props = $props();
</script>

<Select.Content
  data-slot="select-content"
  class={cn(
    'bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 relative z-50 max-h-[min(24rem,60dvh)] min-w-32 overflow-x-hidden overflow-y-auto rounded-md border shadow-md p-1',
    className
  )}
  {...rest}
>
  {@render children()}
</Select.Content>

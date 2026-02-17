<script lang="ts">
  import { Select } from 'bits-ui';
  import { Check } from 'lucide-svelte';
  import { cn } from '$lib/utils';
  import type { Snippet } from 'svelte';

  interface Props {
    value: string;
    class?: string;
    disabled?: boolean;
    children: Snippet;
    [key: string]: unknown;
  }

  let { value, class: className, disabled, children, ...rest }: Props = $props();
</script>

<Select.Item
  data-slot="select-item"
  {value}
  {disabled}
  class={cn(
    "focus:bg-accent focus:text-accent-foreground [&_svg:not([class*='text-'])]:text-muted-foreground relative flex w-full cursor-pointer items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    className
  )}
  {...rest}
>
  <span data-slot="select-item-indicator" class="absolute right-2 flex size-3.5 items-center justify-center">
    {#snippet indicator()}
      <Check class="size-4" />
    {/snippet}
  </span>
  {@render children()}
</Select.Item>

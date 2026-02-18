<script lang="ts">
  import { cn } from '$lib/utils';
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';

  interface Props extends HTMLAttributes<HTMLSpanElement> {
    hero?: boolean;
    class?: string;
    children: Snippet;
  }

  let { hero = false, class: className, children, ...rest }: Props = $props();
</script>

<span
  data-slot="unit-suffix"
  class={cn(hero ? 'text-[0.6em]' : 'text-[0.8em]', 'opacity-50 ml-[0.15em]', className)}
  {...rest}
>{@render children()}</span>

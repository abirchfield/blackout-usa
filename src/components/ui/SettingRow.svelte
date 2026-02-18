<script lang="ts">
  import { cn } from '$lib/utils';
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';

  interface Props extends HTMLAttributes<HTMLDivElement> {
    label: string;
    description?: string;
    descriptionClass?: string;
    htmlFor?: string;
    disabled?: boolean;
    class?: string;
    children: Snippet;
  }

  let { label, description, descriptionClass, htmlFor, disabled = false,
        class: className, children, ...rest }: Props = $props();
</script>

<div
  data-slot="setting-row"
  class={cn(
    'flex items-center justify-between gap-4 py-2.5 px-3 rounded-lg transition-colors',
    disabled && 'opacity-60',
    className
  )}
  {...rest}
>
  <div class="flex-1 min-w-0">
    <label for={htmlFor} class="text-sm font-medium cursor-pointer">{label}</label>
    {#if description}
      <p class={cn('text-xs text-muted-foreground', descriptionClass)}>{description}</p>
    {/if}
  </div>
  {@render children()}
</div>

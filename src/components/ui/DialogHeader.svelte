<script lang="ts">
  import { Dialog } from 'bits-ui';
  import { cn } from '$lib/utils';
  import type { Snippet } from 'svelte';

  interface Props {
    title?: string;
    description?: string;
    class?: string;
    titleClass?: string;
    descriptionClass?: string;
    titleContent?: Snippet;
    descriptionContent?: Snippet;
    [key: string]: unknown;
  }

  let {
    title, description,
    class: className, titleClass, descriptionClass,
    titleContent, descriptionContent,
    ...rest
  }: Props = $props();
</script>

<div data-slot="dialog-header" class={cn('flex flex-col gap-2 text-center sm:text-left', className)} {...rest}>
  {#if title || titleContent}
    <Dialog.Title data-slot="dialog-title" class={cn('text-lg leading-none font-semibold', titleClass)}>
      {#if titleContent}
        {@render titleContent()}
      {:else}
        {title}
      {/if}
    </Dialog.Title>
  {/if}
  {#if description || descriptionContent}
    <Dialog.Description data-slot="dialog-description" class={cn('text-muted-foreground text-sm', descriptionClass)}>
      {#if descriptionContent}
        {@render descriptionContent()}
      {:else}
        {description}
      {/if}
    </Dialog.Description>
  {/if}
</div>

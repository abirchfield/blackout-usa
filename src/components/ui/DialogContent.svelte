<script lang="ts">
  import { Dialog } from 'bits-ui';
  import { X } from 'lucide-svelte';
  import { cn } from '$lib/utils';
  import type { Snippet } from 'svelte';

  interface Props {
    class?: string;
    showCloseButton?: boolean;
    overlayClass?: string;
    children: Snippet;
    [key: string]: unknown;
  }

  let { class: className, showCloseButton = true, overlayClass, children, ...rest }: Props = $props();
</script>

<Dialog.Portal>
  <Dialog.Overlay
    data-slot="dialog-overlay"
    class={cn(
      'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50',
      overlayClass
    )}
  />
  <Dialog.Content
    class={cn(
      'bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 outline-none sm:max-w-lg',
      className
    )}
    {...rest}
  >
    {@render children()}
    {#if showCloseButton}
      <Dialog.Close
        class="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden cursor-pointer disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
      >
        <X />
        <span class="sr-only">Close</span>
      </Dialog.Close>
    {/if}
  </Dialog.Content>
</Dialog.Portal>

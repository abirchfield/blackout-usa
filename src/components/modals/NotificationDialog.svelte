<script lang="ts">
  import { Dialog } from 'bits-ui';
  import DialogContent from '$components/ui/DialogContent.svelte';
  import DialogHeader from '$components/ui/DialogHeader.svelte';
  import Button from '$components/ui/Button.svelte';
  import Badge from '$components/ui/Badge.svelte';
  import { X } from 'lucide-svelte';

  interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    items: Array<{ id: number; time: string; message: string; critical?: boolean }>;
    onRemove: (id: number) => void;
    onDismissAll: () => void;
    emptyMessage: string;
    ariaLabel: string;
  }

  let { open, onOpenChange, title, description, items, onRemove, onDismissAll, emptyMessage, ariaLabel }: Props = $props();
</script>

{#if open}
  <Dialog.Root {open} {onOpenChange}>
    <DialogContent id="notifications-modal" class="sm:max-w-lg">
      <DialogHeader {title} {description} />
      <div class="max-h-[70vh] modal-scroll">
        {#if items.length === 0}
          <div class="p-4 text-center text-muted-foreground">{emptyMessage}</div>
        {:else}
          <div>
            <div class="flex justify-end p-2 border-b">
              <Button variant="ghost" size="sm" onclick={onDismissAll}>Dismiss All</Button>
            </div>
            <ul class="flex flex-col" aria-label={ariaLabel}>
              {#each items as item (item.id)}
                <li class="flex items-start gap-3 border-b p-3">
                  <Badge variant="secondary" class="mt-0.5 whitespace-nowrap">{item.time}</Badge>
                  <p class="flex-1 text-sm leading-snug {item.critical ? 'text-destructive font-semibold' : ''}">
                    {#if item.critical}<span class="sr-only">Critical: </span>{/if}
                    {item.message}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    onclick={() => onRemove(item.id)}
                    class="h-6 w-6 shrink-0"
                    aria-label="Dismiss: {item.message}"
                  >
                    <X class="h-4 w-4" aria-hidden="true" />
                  </Button>
                </li>
              {/each}
            </ul>
          </div>
        {/if}
      </div>
    </DialogContent>
  </Dialog.Root>
{/if}

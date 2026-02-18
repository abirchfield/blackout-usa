<script lang="ts">
  import { Dialog } from 'bits-ui';
  import DialogContent from '$components/ui/DialogContent.svelte';
  import Button from '$components/ui/Button.svelte';
  import { settings } from '$lib/stores/settings.svelte';
  import { RotateCw, ArrowRight, LogOut, Play } from 'lucide-svelte';

  interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    day: number;
    onQuitToStart: () => void;
    onReplayDay: (currentDay: number) => void;
    onNextDay: () => void;
  }

  let { open, onOpenChange, day, onQuitToStart, onReplayDay, onNextDay }: Props = $props();
</script>

<Dialog.Root {open} {onOpenChange}>
  <DialogContent id="quit-modal" class="sm:max-w-sm font-sans p-0 gap-0 overflow-hidden border-border/50">
    <!-- Header -->
    <div class="px-5 pt-5 pb-4">
      <Dialog.Title class="text-lg font-bold tracking-wide uppercase text-foreground">Quit the game?</Dialog.Title>
      <Dialog.Description class="text-sm text-muted-foreground mt-1">Choose how to continue your session.</Dialog.Description>
    </div>

    <!-- Actions -->
    <div role="group" aria-label="Quit actions" class="px-5 pb-5 flex flex-col gap-2">
      <Button
        class="w-full justify-center gap-2 h-11 text-base"
        onclick={() => onOpenChange(false)}
      >
        <Play class="h-4 w-4" aria-hidden="true" />
        <span>Back to work!</span>
      </Button>

      <div class="grid grid-cols-2 gap-2">
        <Button
          variant={settings.hcVariant}
          class="w-full justify-center gap-2"
          onclick={() => onReplayDay(day)}
        >
          <RotateCw class="h-4 w-4" aria-hidden="true" />
          <span>Replay Day</span>
        </Button>
        <Button
          variant={settings.hcVariant}
          class="w-full justify-center gap-2"
          onclick={() => onNextDay()}
        >
          <span>Next Day</span>
          <ArrowRight class="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>

      <div class="border-t border-border/50 pt-2 mt-1">
        <Button
          variant="ghost"
          size="sm"
          class="w-full justify-center gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
          onclick={onQuitToStart}
        >
          <LogOut class="h-3.5 w-3.5" aria-hidden="true" />
          <span>Leave to Home</span>
        </Button>
      </div>
    </div>
  </DialogContent>
</Dialog.Root>

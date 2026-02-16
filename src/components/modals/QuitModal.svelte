<script lang="ts">
  import { Dialog } from 'bits-ui';
  import DialogContent from '$components/ui/DialogContent.svelte';
  import DialogHeader from '$components/ui/DialogHeader.svelte';
  import DialogTitle from '$components/ui/DialogTitle.svelte';
  import DialogDescription from '$components/ui/DialogDescription.svelte';
  import Button from '$components/ui/Button.svelte';
  import { hcVariant } from '$lib/utils';
  import { RotateCw, ArrowRight, LogOut, Play } from 'lucide-svelte';

  interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    day: number;
    onQuitToStart: () => void;
    onReplayDay: (currentDay: number) => void;
    onNextDay: (currentDay: number) => void;
    isHighContrast?: boolean;
  }

  let { open, onOpenChange, day, onQuitToStart, onReplayDay, onNextDay, isHighContrast }: Props = $props();
</script>

<Dialog.Root {open} {onOpenChange}>
  <DialogContent id="quit-modal" class="sm:max-w-lg font-sans" overlayClass="bg-black/70">
    <DialogHeader>
      <DialogTitle class="text-2xl">Quit the game?</DialogTitle>
      <DialogDescription>Choose how to continue your session.</DialogDescription>
    </DialogHeader>
    <div role="group" aria-label="Quit actions" class="grid grid-cols-1 gap-2 pt-2">
      <Button
        class="w-full justify-center gap-2"
        onclick={() => onOpenChange(false)}
      >
        <Play class="h-4 w-4" aria-hidden="true" />
        <span>Back to work!</span>
      </Button>
      <div class="grid grid-cols-2 gap-2">
        <Button
          variant={hcVariant(isHighContrast ?? false)}
          class="w-full justify-center gap-2"
          onclick={() => onReplayDay(day)}
        >
          <RotateCw class="h-4 w-4" aria-hidden="true" />
          <span>Replay Day</span>
        </Button>
        <Button
          variant={hcVariant(isHighContrast ?? false)}
          class="w-full justify-center gap-2"
          onclick={() => onNextDay(day)}
        >
          <span>Next Day</span>
          <ArrowRight class="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
      <Button
        variant="destructive"
        size="sm"
        class="w-full justify-center gap-2"
        onclick={onQuitToStart}
      >
        <LogOut class="h-4 w-4" aria-hidden="true" />
        <span>Home Page</span>
      </Button>
    </div>
  </DialogContent>
</Dialog.Root>

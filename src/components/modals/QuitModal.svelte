<script lang="ts">
  import { Dialog } from 'bits-ui';
  import DialogContent from '$components/ui/DialogContent.svelte';
  import DialogHeader from '$components/ui/DialogHeader.svelte';
  import Button from '$components/ui/Button.svelte';
  import { settings } from '$lib/stores/settings.svelte';
  import { RotateCw, ArrowRight, LogOut, Play } from 'lucide-svelte';

  interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    day: number;
    onQuitToStart: () => void;
    onReplayDay: (currentDay: number) => void;
    onNextDay: (currentDay: number) => void;
  }

  let { open, onOpenChange, day, onQuitToStart, onReplayDay, onNextDay }: Props = $props();
</script>

<Dialog.Root {open} {onOpenChange}>
  <DialogContent id="quit-modal" class="sm:max-w-lg font-sans" overlayClass="bg-black/70">
    <DialogHeader title="Quit the game?" titleClass="text-2xl" description="Choose how to continue your session." />
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

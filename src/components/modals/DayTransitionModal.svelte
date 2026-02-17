<script lang="ts">
  import { Dialog } from 'bits-ui';
  import DialogContent from '$components/ui/DialogContent.svelte';
  import DialogHeader from '$components/ui/DialogHeader.svelte';
  import { RotateCw, ArrowRight } from 'lucide-svelte';
  import Button from '$components/ui/Button.svelte';
  import { settings } from '$lib/stores/settings.svelte';
  import DayResults from '$components/game/DayResults.svelte';
  import type { ResultDetails, StatsSnapshot } from '$lib/types';

  interface Props {
    open: boolean;
    mode: 'briefing' | 'results';
    targetDay: number;
    info: string[] | null | undefined;
    resultDetails: ResultDetails | null | undefined;
    gameStatistics: StatsSnapshot;
    onStartDay: () => void;
    onClose: () => void;
    onReplayDay: (day: number) => void;
    onNextDay: (day: number) => void;
  }

  let {
    open,
    mode,
    targetDay,
    info,
    resultDetails,
    gameStatistics,
    onStartDay,
    onClose,
    onReplayDay,
    onNextDay,
  }: Props = $props();

  // Check if day is in progress (user can close briefing to continue)
  let isDayInProgress = $derived(gameStatistics.day === targetDay && gameStatistics.timeStep > 0);

  // Determine if modal should be dismissible
  // Results modal is never dismissible (must choose replay or next)
  // Briefing is only dismissible if day is already in progress
  let canDismiss = $derived(mode === 'briefing' && isDayInProgress);
</script>

{#if open}
  <Dialog.Root {open} onOpenChange={(isOpen) => { if (!isOpen && canDismiss) onClose(); }}>
    <DialogContent
      id="day-transition-modal"
      class="sm:max-w-lg font-sans"
      overlayClass="bg-black/70"
      showCloseButton={canDismiss}
      onPointerDownOutside={(e: Event) => { if (!canDismiss) e.preventDefault(); else onClose(); }}
      onEscapeKeyDown={(e: Event) => { if (!canDismiss) e.preventDefault(); else onClose(); }}
    >
      {#if mode === 'results' && resultDetails}
        <DialogHeader class="sr-only" title="Day {gameStatistics.day} Results" description="Review your performance for this day." />
        <div class="space-y-6">
          <DayResults stats={gameStatistics} day={gameStatistics.day} {resultDetails} />
          <div class="grid grid-cols-2 gap-3 pt-2">
            <Button
              onclick={() => onReplayDay(gameStatistics.day)}
              variant={settings.hcVariant}
              class="flex items-center justify-center gap-2"
            >
              <RotateCw class="h-4 w-4" aria-hidden="true" />
              <span>Replay Today</span>
            </Button>
            <Button
              onclick={() => onNextDay(gameStatistics.day)}
              class="flex items-center justify-center gap-2"
            >
              <span>Next Day</span>
              <ArrowRight class="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      {:else if info}
        <DialogHeader title="Day {targetDay} Briefing" titleClass="text-2xl" description="Read the briefing and start the day when ready." descriptionClass="sr-only" />
        <div class="space-y-6">
          <div class="bg-muted/20 p-4 rounded-lg border border-border text-sm">
            {#if info.length > 1}
              <ul class="list-disc pl-4 space-y-2">
                {#each info as line}
                  <li>{line}</li>
                {/each}
              </ul>
            {:else}
              <p>{info[0]}</p>
            {/if}
          </div>
          {#if isDayInProgress}
            <Button onclick={onClose} variant="secondary" class="w-full text-lg py-6">
              Continue
            </Button>
          {:else}
            <Button onclick={onStartDay} class="w-full text-lg py-6">
              Start Day {targetDay}
            </Button>
          {/if}
        </div>
      {/if}
    </DialogContent>
  </Dialog.Root>
{/if}

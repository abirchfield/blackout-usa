<script lang="ts">
  interface Props {
    day: number;
    timeStr: string;
    timeIso: string;
    idPrefix: string;
    size: 'sm' | 'lg';
  }

  let { day, timeStr, timeIso, idPrefix, size }: Props = $props();

  let textClass = $derived(size === 'lg' ? 'text-2xl sm:text-3xl' : 'text-lg');
</script>

<div class="flex items-center gap-4" role="timer" aria-labelledby="{idPrefix}-day-label {idPrefix}-day-value {idPrefix}-time-value">
  <div class="flex items-center gap-2">
    <span id="{idPrefix}-day-label" class="{textClass} font-semibold text-muted-foreground uppercase">Day</span>
    <span id="{idPrefix}-day-value" class="{textClass} font-semibold text-muted-foreground font-numeric">{day ?? 1}</span>
  </div>
  <time id="{idPrefix}-time-value" dateTime={timeIso} class="{textClass} font-bold text-foreground font-numeric tracking-wider">{timeStr}</time>
</div>

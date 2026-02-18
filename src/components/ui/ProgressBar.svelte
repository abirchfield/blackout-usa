<script lang="ts">
  import { cn } from '$lib/utils';

  interface Props {
    value: number;
    max?: number;
    height?: 'sm' | 'md';
    colorClass?: string;
    label?: string;
    class?: string;
  }

  let { value, max = 100, height = 'md', colorClass = 'bg-primary',
        label, class: className }: Props = $props();
  let pct = $derived(Math.min(100, (value / max) * 100));
  const h = $derived(height === 'sm' ? 'h-1.5' : 'h-2');
</script>

<div
  role={label ? 'progressbar' : undefined}
  aria-valuenow={label ? value : undefined}
  aria-valuemin={label ? 0 : undefined}
  aria-valuemax={label ? max : undefined}
  aria-label={label}
  class={cn('progress-track', h, className)}
>
  <div class={cn('progress-fill', h, colorClass)} style="width: {pct}%"></div>
</div>

<script lang="ts">
  import { Slider } from 'bits-ui';
  import { cn } from '$lib/utils';

  interface Props {
    value?: number;
    min?: number;
    max?: number;
    step?: number;
    disabled?: boolean;
    onValueChange?: (value: number) => void;
    onValueCommit?: (value: number) => void;
    class?: string;
    [key: string]: unknown;
  }

  let { value = $bindable(0), min = 0, max = 100, step = 1, disabled, onValueChange, onValueCommit, class: className, ...rest }: Props = $props();
</script>

<Slider.Root
  data-slot="slider"
  type="single"
  bind:value
  {min}
  {max}
  {step}
  {disabled}
  {onValueChange}
  {onValueCommit}
  class={cn(
    'relative flex w-full touch-none items-center select-none data-[disabled]:opacity-65',
    className
  )}
  {...rest}
>
  {#snippet children({ thumbs })}
    <span
      data-slot="slider-track"
      class="bg-muted relative grow overflow-hidden rounded-full h-1.5 w-full"
    >
      <Slider.Range
        data-slot="slider-range"
        class="bg-primary absolute h-full"
      />
    </span>
    {#each thumbs as index}
      <Slider.Thumb
        data-slot="slider-thumb"
        {index}
        class="z-10 border-primary ring-ring/50 block size-4 shrink-0 rounded-full border-2 bg-white shadow-sm transition-[color,box-shadow] hover:ring-4 focus-visible:ring-4 focus-visible:outline-hidden cursor-grab active:cursor-grabbing disabled:pointer-events-none disabled:opacity-50"
      />
    {/each}
  {/snippet}
</Slider.Root>

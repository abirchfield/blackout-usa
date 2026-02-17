<script lang="ts">
  import { cn } from '$lib/utils';
  import { GenerationTypeConfig } from '$components/theme';
  import { SubstationCategory } from '$lib/types';

  interface Props {
    category: SubstationCategory;
    class?: string;
    [key: string]: unknown;
  }

  let { category, class: className, ...rest }: Props = $props();

  let config = $derived(GenerationTypeConfig[category] ?? GenerationTypeConfig[SubstationCategory.Thermal]);
</script>

<config.icon class={cn('w-5 h-5', config.tailwind.text, className)} {...rest} />

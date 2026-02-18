<script lang="ts">
  import { cn } from '$lib/utils';
  import { cva, type VariantProps } from 'class-variance-authority';
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';

  const sectionLabelVariants = cva('section-label', {
    variants: {
      variant: {
        default: 'text-[0.65rem] text-muted-foreground mb-2',
        sidebar: 'text-[0.65rem] text-sidebar-foreground/60',
        compact: 'text-[0.6rem] text-muted-foreground/60',
        dashboard: 'text-xs sm:text-sm text-muted-foreground border-b border-border/50 pb-1',
      },
    },
    defaultVariants: { variant: 'default' },
  });

  interface Props extends HTMLAttributes<HTMLHeadingElement> {
    variant?: VariantProps<typeof sectionLabelVariants>['variant'];
    class?: string;
    children: Snippet;
  }

  let { variant = 'default', class: className, children, ...rest }: Props = $props();
</script>

<h5 data-slot="section-label" class={cn(sectionLabelVariants({ variant }), className)} {...rest}>
  {@render children()}
</h5>

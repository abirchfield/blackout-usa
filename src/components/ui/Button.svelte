<script lang="ts">
  import { cn } from '$lib/utils';
  import { buttonVariants } from './button-variants';
  import type { VariantProps } from 'class-variance-authority';
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';

  type ButtonVariant = VariantProps<typeof buttonVariants>['variant'];
  type ButtonSize = VariantProps<typeof buttonVariants>['size'];

  interface Props {
    variant?: ButtonVariant;
    size?: ButtonSize;
    href?: string;
    class?: string;
    children: Snippet;
    disabled?: boolean;
    type?: HTMLButtonAttributes['type'];
    [key: string]: unknown;
  }

  let { variant = 'default', size = 'default', href, class: className, children, ...rest }: Props = $props();

</script>

{#if href}
  <a {href} data-slot="button" class={cn(buttonVariants({ variant, size }), className)} {...rest}>
    {@render children()}
  </a>
{:else}
  <button data-slot="button" class={cn(buttonVariants({ variant, size }), className)} {...rest}>
    {@render children()}
  </button>
{/if}

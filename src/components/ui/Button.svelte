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

  let { variant = 'default', size = 'default', href, class: className, children, disabled = false, ...rest }: Props = $props();

</script>

{#if href}
  <a
    href={disabled ? undefined : href}
    aria-disabled={disabled ? 'true' : undefined}
    tabindex={disabled ? -1 : undefined}
    onclick={(e) => {
      if (disabled) {
        e.preventDefault();
        e.stopPropagation();
      }
    }}
    data-slot="button"
    class={cn(buttonVariants({ variant, size }), disabled && 'pointer-events-none opacity-50', className)}
    {...rest}
  >
    {@render children()}
  </a>
{:else}
  <button data-slot="button" disabled={disabled} class={cn(buttonVariants({ variant, size }), className)} {...rest}>
    {@render children()}
  </button>
{/if}

<script lang="ts" module>
  /**
   * Empty.Media — leading visual slot for an Empty placeholder
   * (icon, image, or illustration). Exposes a `variant` prop and
   * its TV variants helper for callers that need to compose
   * matching styles externally.
   *
   * @module
   */
  import { tv, type VariantProps } from 'tailwind-variants';

  /** TV variants helper for the Empty.Media slot — drives icon vs default styling. */
  export const emptyMediaVariants = tv({
    base: 'mb-2 flex shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg]:shrink-0',
    variants: {
      variant: {
        default: 'bg-transparent',
        icon: "bg-muted text-foreground flex size-10 shrink-0 items-center justify-center rounded-lg [&_svg:not([class*='size-'])]:size-6",
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  });

  /** Variant prop type for the Empty.Media slot — `default` or `icon`. */
  export type EmptyMediaVariant = VariantProps<typeof emptyMediaVariants>['variant'];
</script>

<script lang="ts">
  import { cn, type WithElementRef } from '../utils.js';
  import type { HTMLAttributes } from 'svelte/elements';

  let {
    ref = $bindable(null),
    class: className,
    children,
    /** Media display variant. @values icon, image, illustration */
    variant = 'default',
    ...restProps
  }: WithElementRef<HTMLAttributes<HTMLDivElement>> & { variant?: EmptyMediaVariant } = $props();
</script>

<div
  bind:this={ref}
  data-slot="empty-icon"
  data-variant={variant}
  class={cn(emptyMediaVariants({ variant }), className)}
  {...restProps}
>
  {@render children?.()}
</div>

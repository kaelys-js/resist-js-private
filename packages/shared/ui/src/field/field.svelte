<!-- @convert-to-lens -->
<script lang="ts" module>
  /**
   * Field — root container for a form field that composes
   * `Label` / `Description` / `Error` / `Content` slots with a
   * vertical / horizontal / responsive orientation. Exposes its
   * TV variants helper so callers can compose matching styles.
   *
   * @module
   */
  import { tv, type VariantProps } from 'tailwind-variants';

  /** TV variants helper for the Field root — drives orientation styles. */
  export const fieldVariants = tv({
    base: 'group/field data-[invalid=true]:text-destructive flex w-full gap-3',
    variants: {
      orientation: {
        vertical: 'flex-col [&>*]:w-full [&>.sr-only]:w-auto',
        horizontal: [
          'flex-row items-center',
          '[&>[data-slot=field-label]]:flex-auto',
          'has-[>[data-slot=field-content]]:items-start has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px',
        ],
        responsive: [
          'flex-col @md/field-group:flex-row @md/field-group:items-center [&>*]:w-full @md/field-group:[&>*]:w-auto [&>.sr-only]:w-auto',
          '@md/field-group:[&>[data-slot=field-label]]:flex-auto',
          '@md/field-group:has-[>[data-slot=field-content]]:items-start @md/field-group:has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px',
        ],
      },
    },
    defaultVariants: {
      orientation: 'vertical',
    },
  });

  /** Orientation prop type for the Field root — `vertical`, `horizontal`, or `responsive`. */
  export type FieldOrientation = VariantProps<typeof fieldVariants>['orientation'];
</script>

<script lang="ts">
  import { cn, type WithElementRef } from '../utils.js';
  import type { HTMLAttributes } from 'svelte/elements';

  let {
    ref = $bindable(null),
    class: className,
    /** Field layout orientation. @values horizontal, vertical */
    orientation = 'vertical',
    children,
    ...restProps
  }: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
    orientation?: FieldOrientation;
  } = $props();
</script>

<div
  bind:this={ref}
  role="group"
  data-slot="field"
  data-orientation={orientation}
  class={cn(fieldVariants({ orientation }), className)}
  {...restProps}
>
  {@render children?.()}
</div>

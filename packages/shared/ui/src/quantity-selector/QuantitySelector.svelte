<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * QuantitySelector Svelte component — plus/minus stepper
   * counter for cart and product line-item quantities.
   * Placeholder shell awaiting full implementation; ships with
   * a class prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const QuantitySelectorPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for QuantitySelector. */
  export type QuantitySelectorProps = v.InferOutput<typeof QuantitySelectorPropsSchema>;
</script>

<script lang="ts">
  /**
   * QuantitySelector — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <QuantitySelector />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = QuantitySelectorProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: QuantitySelectorProps = $derived.by(() => {
    const rawProps: QuantitySelectorProps = stripSvelteProps(allProps);
    const result = safeParse(QuantitySelectorPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as QuantitySelectorProps;
  });
</script>

<div data-slot="quantity-selector" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

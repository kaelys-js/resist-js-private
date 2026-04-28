<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * PricingSlider Svelte component — usage-based pricing
   * slider widget. Placeholder shell awaiting full
   * implementation; ships with a class prop for root-level
   * styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const PricingSliderPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for PricingSlider. */
  export type PricingSliderProps = v.InferOutput<typeof PricingSliderPropsSchema>;
</script>

<script lang="ts">
  /**
   * PricingSlider — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <PricingSlider />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = PricingSliderProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: PricingSliderProps = $derived.by(() => {
    const rawProps: PricingSliderProps = stripSvelteProps(allProps);
    const result = safeParse(PricingSliderPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as PricingSliderProps;
  });
</script>

<div data-slot="pricing-slider" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

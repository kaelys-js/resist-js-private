<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * PricingCard Svelte component — pricing tier card with
   * features list and CTA. Placeholder shell awaiting full
   * implementation; ships with a class prop for root-level
   * styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const PricingCardPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for PricingCard. */
  export type PricingCardProps = v.InferOutput<typeof PricingCardPropsSchema>;
</script>

<script lang="ts">
  /**
   * PricingCard — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <PricingCard />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = PricingCardProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: PricingCardProps = $derived.by(() => {
    const rawProps: PricingCardProps = stripSvelteProps(allProps);
    const result = safeParse(PricingCardPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as PricingCardProps;
  });
</script>

<div data-slot="pricing-card" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

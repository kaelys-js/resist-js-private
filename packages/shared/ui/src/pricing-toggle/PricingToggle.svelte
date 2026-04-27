<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const PricingTogglePropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for PricingToggle. */
  export type PricingToggleProps = v.InferOutput<typeof PricingTogglePropsSchema>;
</script>

<script lang="ts">
  /**
   * PricingToggle — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <PricingToggle />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = PricingToggleProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: PricingToggleProps = $derived.by(() => {
    const rawProps: PricingToggleProps = stripSvelteProps(allProps);
    const result = safeParse(PricingTogglePropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as PricingToggleProps;
  });
</script>

<div data-slot="pricing-toggle" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

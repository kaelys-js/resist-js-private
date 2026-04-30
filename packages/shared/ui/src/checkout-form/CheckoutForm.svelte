<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * CheckoutForm — multi-step e-commerce checkout form with
   * payment collection. Placeholder shell awaiting full
   * implementation; ships with a `class` prop for root-level
   * styling overrides.
   *
   * @module
   */

  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const CheckoutFormPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for CheckoutForm. */
  export type CheckoutFormProps = v.InferOutput<typeof CheckoutFormPropsSchema>;
</script>

<script lang="ts">
  /**
   * CheckoutForm — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <CheckoutForm />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = CheckoutFormProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: CheckoutFormProps = $derived.by(() => {
    const rawProps: CheckoutFormProps = stripSvelteProps(allProps);
    const result = safeParse(CheckoutFormPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as CheckoutFormProps;
  });
</script>

<div data-slot="checkout-form" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

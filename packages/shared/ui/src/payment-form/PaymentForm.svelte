<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * PaymentForm Svelte component — checkout payment form
   * (card / wallet). Placeholder shell awaiting full
   * implementation; ships with a class prop for root-level
   * styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const PaymentFormPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for PaymentForm. */
  export type PaymentFormProps = v.InferOutput<typeof PaymentFormPropsSchema>;
</script>

<script lang="ts">
  /**
   * PaymentForm — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <PaymentForm />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = PaymentFormProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: PaymentFormProps = $derived.by(() => {
    const rawProps: PaymentFormProps = stripSvelteProps(allProps);
    const result = safeParse(PaymentFormPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as PaymentFormProps;
  });
</script>

<div data-slot="payment-form" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

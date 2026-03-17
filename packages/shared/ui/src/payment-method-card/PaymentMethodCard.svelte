<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const PaymentMethodCardPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type PaymentMethodCardProps = v.InferOutput<typeof PaymentMethodCardPropsSchema>;
</script>

<script lang="ts">
  /**
   * PaymentMethodCard — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <PaymentMethodCard />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = PaymentMethodCardProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: PaymentMethodCardProps = $derived.by(() => {
    const rawProps: PaymentMethodCardProps = stripSvelteProps(allProps);
    const result = safeParse(PaymentMethodCardPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as PaymentMethodCardProps;
  });
</script>

<div data-slot="payment-method-card" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

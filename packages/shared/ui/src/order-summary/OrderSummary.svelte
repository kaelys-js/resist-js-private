<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const OrderSummaryPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type OrderSummaryProps = v.InferOutput<typeof OrderSummaryPropsSchema>;
</script>

<script lang="ts">
  /**
   * OrderSummary — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <OrderSummary />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = OrderSummaryProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: OrderSummaryProps = $derived.by(() => {
    const rawProps: OrderSummaryProps = stripSvelteProps(allProps);
    const result = safeParse(OrderSummaryPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as OrderSummaryProps;
  });
</script>

<div data-slot="order-summary" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

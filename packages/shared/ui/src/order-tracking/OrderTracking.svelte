<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const OrderTrackingPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type OrderTrackingProps = v.InferOutput<typeof OrderTrackingPropsSchema>;
</script>

<script lang="ts">
  /**
   * OrderTracking — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <OrderTracking />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = OrderTrackingProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: OrderTrackingProps = $derived.by(() => {
    const rawProps: OrderTrackingProps = stripSvelteProps(allProps);
    const result = safeParse(OrderTrackingPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as OrderTrackingProps;
  });
</script>

<div data-slot="order-tracking" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

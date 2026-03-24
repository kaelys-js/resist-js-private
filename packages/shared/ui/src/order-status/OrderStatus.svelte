<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const OrderStatusPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type OrderStatusProps = v.InferOutput<typeof OrderStatusPropsSchema>;
</script>

<script lang="ts">
  /**
   * OrderStatus — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <OrderStatus />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = OrderStatusProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: OrderStatusProps = $derived.by(() => {
    const rawProps: OrderStatusProps = stripSvelteProps(allProps);
    const result = safeParse(OrderStatusPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as OrderStatusProps;
  });
</script>

<div data-slot="order-status" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

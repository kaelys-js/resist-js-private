<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * OrderList Svelte component — admin orders table /
   * list. Placeholder shell awaiting full implementation;
   * ships with a class prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const OrderListPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for OrderList. */
  export type OrderListProps = v.InferOutput<typeof OrderListPropsSchema>;
</script>

<script lang="ts">
  /**
   * OrderList — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <OrderList />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = OrderListProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: OrderListProps = $derived.by(() => {
    const rawProps: OrderListProps = stripSvelteProps(allProps);
    const result = safeParse(OrderListPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as OrderListProps;
  });
</script>

<div data-slot="order-list" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

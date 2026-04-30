<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * CartItem — single line-item row in a shopping cart with
   * quantity controls. Placeholder shell awaiting full
   * implementation; ships with a `class` prop for root-level
   * styling overrides.
   *
   * @module
   */

  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const CartItemPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for CartItem. */
  export type CartItemProps = v.InferOutput<typeof CartItemPropsSchema>;
</script>

<script lang="ts">
  /**
   * CartItem — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <CartItem />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = CartItemProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: CartItemProps = $derived.by(() => {
    const rawProps: CartItemProps = stripSvelteProps(allProps);
    const result = safeParse(CartItemPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as CartItemProps;
  });
</script>

<div data-slot="cart-item" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

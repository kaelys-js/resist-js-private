<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ShoppingCartPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type ShoppingCartProps = v.InferOutput<typeof ShoppingCartPropsSchema>;
</script>

<script lang="ts">
  /**
   * ShoppingCart — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ShoppingCart />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ShoppingCartProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ShoppingCartProps = $derived.by(() => {
    const rawProps: ShoppingCartProps = stripSvelteProps(allProps);
    const result = safeParse(ShoppingCartPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ShoppingCartProps;
  });
</script>

<div data-slot="shopping-cart" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

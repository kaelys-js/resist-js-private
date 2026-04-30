<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * WishlistButton Svelte component — heart-icon toggle
   * button for adding / removing items from a wishlist.
   * Placeholder shell awaiting full implementation; ships
   * with a class prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const WishlistButtonPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for WishlistButton. */
  export type WishlistButtonProps = v.InferOutput<typeof WishlistButtonPropsSchema>;
</script>

<script lang="ts">
  /**
   * WishlistButton — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <WishlistButton />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = WishlistButtonProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: WishlistButtonProps = $derived.by(() => {
    const rawProps: WishlistButtonProps = stripSvelteProps(allProps);
    const result = safeParse(WishlistButtonPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as WishlistButtonProps;
  });
</script>

<div data-slot="wishlist-button" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

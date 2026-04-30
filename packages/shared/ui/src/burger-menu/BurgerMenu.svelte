<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * BurgerMenu — hamburger menu toggle for mobile navigation.
   * Placeholder shell awaiting full implementation; ships with a
   * `class` prop for root-level styling overrides.
   *
   * @module
   */

  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const BurgerMenuPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for BurgerMenu. */
  export type BurgerMenuProps = v.InferOutput<typeof BurgerMenuPropsSchema>;
</script>

<script lang="ts">
  /**
   * BurgerMenu — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <BurgerMenu />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = BurgerMenuProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: BurgerMenuProps = $derived.by(() => {
    const rawProps: BurgerMenuProps = stripSvelteProps(allProps);
    const result = safeParse(BurgerMenuPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as BurgerMenuProps;
  });
</script>

<div data-slot="burger-menu" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

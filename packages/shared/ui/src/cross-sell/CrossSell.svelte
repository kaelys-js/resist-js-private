<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * CrossSell — related-products / cross-sell carousel for
   * e-commerce. Placeholder shell awaiting full implementation;
   * ships with a `class` prop for root-level styling overrides.
   *
   * @module
   */

  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const CrossSellPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for CrossSell. */
  export type CrossSellProps = v.InferOutput<typeof CrossSellPropsSchema>;
</script>

<script lang="ts">
  /**
   * CrossSell — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <CrossSell />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = CrossSellProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: CrossSellProps = $derived.by(() => {
    const rawProps: CrossSellProps = stripSvelteProps(allProps);
    const result = safeParse(CrossSellPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as CrossSellProps;
  });
</script>

<div data-slot="cross-sell" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

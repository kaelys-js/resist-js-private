<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * MiniCart Svelte component — compact e-commerce cart
   * preview popover with line items and total. Placeholder
   * shell awaiting full implementation; ships with a class prop
   * for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const MiniCartPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for MiniCart. */
  export type MiniCartProps = v.InferOutput<typeof MiniCartPropsSchema>;
</script>

<script lang="ts">
  /**
   * MiniCart — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <MiniCart />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = MiniCartProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: MiniCartProps = $derived.by(() => {
    const rawProps: MiniCartProps = stripSvelteProps(allProps);
    const result = safeParse(MiniCartPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as MiniCartProps;
  });
</script>

<div data-slot="mini-cart" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

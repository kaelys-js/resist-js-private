<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * InventoryIndicator Svelte component — commerce stock /
   * availability status badge. Placeholder shell awaiting full
   * implementation; ships with a class prop for root-level
   * styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const InventoryIndicatorPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for InventoryIndicator. */
  export type InventoryIndicatorProps = v.InferOutput<typeof InventoryIndicatorPropsSchema>;
</script>

<script lang="ts">
  /**
   * InventoryIndicator — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <InventoryIndicator />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = InventoryIndicatorProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: InventoryIndicatorProps = $derived.by(() => {
    const rawProps: InventoryIndicatorProps = stripSvelteProps(allProps);
    const result = safeParse(InventoryIndicatorPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as InventoryIndicatorProps;
  });
</script>

<div data-slot="inventory-indicator" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * CraftingGrid — game-style crafting recipe grid for combining
   * items. Placeholder shell awaiting full implementation; ships
   * with a `class` prop for root-level styling overrides.
   *
   * @module
   */

  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const CraftingGridPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for CraftingGrid. */
  export type CraftingGridProps = v.InferOutput<typeof CraftingGridPropsSchema>;
</script>

<script lang="ts">
  /**
   * CraftingGrid — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <CraftingGrid />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = CraftingGridProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: CraftingGridProps = $derived.by(() => {
    const rawProps: CraftingGridProps = stripSvelteProps(allProps);
    const result = safeParse(CraftingGridPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as CraftingGridProps;
  });
</script>

<div data-slot="crafting-grid" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * Minimap Svelte component — overview navigator for a
   * scrollable canvas. Placeholder shell awaiting full
   * implementation; ships with a class prop for root-level
   * styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const MinimapPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for Minimap. */
  export type MinimapProps = v.InferOutput<typeof MinimapPropsSchema>;
</script>

<script lang="ts">
  /**
   * Minimap — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Minimap />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = MinimapProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: MinimapProps = $derived.by(() => {
    const rawProps: MinimapProps = stripSvelteProps(allProps);
    const result = safeParse(MinimapPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as MinimapProps;
  });
</script>

<div data-slot="minimap" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

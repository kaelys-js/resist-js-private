<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * Directions — turn-by-turn route directions panel.
   * Placeholder shell awaiting full implementation; ships with a
   * `class` prop for root-level styling overrides.
   *
   * @module
   */

  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const DirectionsPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for Directions. */
  export type DirectionsProps = v.InferOutput<typeof DirectionsPropsSchema>;
</script>

<script lang="ts">
  /**
   * Directions — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Directions />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = DirectionsProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: DirectionsProps = $derived.by(() => {
    const rawProps: DirectionsProps = stripSvelteProps(allProps);
    const result = safeParse(DirectionsPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as DirectionsProps;
  });
</script>

<div data-slot="directions" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

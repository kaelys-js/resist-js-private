<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * CursorGlow — radial glow that follows the mouse cursor.
   * Placeholder shell awaiting full implementation; ships with a
   * `class` prop for root-level styling overrides.
   *
   * @module
   */

  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const CursorGlowPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for CursorGlow. */
  export type CursorGlowProps = v.InferOutput<typeof CursorGlowPropsSchema>;
</script>

<script lang="ts">
  /**
   * CursorGlow — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <CursorGlow />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = CursorGlowProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: CursorGlowProps = $derived.by(() => {
    const rawProps: CursorGlowProps = stripSvelteProps(allProps);
    const result = safeParse(CursorGlowPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as CursorGlowProps;
  });
</script>

<div data-slot="cursor-glow" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * CursorTrail — particle / line trail that follows the mouse
   * cursor. Placeholder shell awaiting full implementation;
   * ships with a `class` prop for root-level styling overrides.
   *
   * @module
   */

  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const CursorTrailPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for CursorTrail. */
  export type CursorTrailProps = v.InferOutput<typeof CursorTrailPropsSchema>;
</script>

<script lang="ts">
  /**
   * CursorTrail — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <CursorTrail />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = CursorTrailProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: CursorTrailProps = $derived.by(() => {
    const rawProps: CursorTrailProps = stripSvelteProps(allProps);
    const result = safeParse(CursorTrailPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as CursorTrailProps;
  });
</script>

<div data-slot="cursor-trail" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

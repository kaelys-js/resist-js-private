<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * DotPattern — repeating dot-grid background pattern.
   * Placeholder shell awaiting full implementation; ships with a
   * `class` prop for root-level styling overrides.
   *
   * @module
   */

  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const DotPatternPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for DotPattern. */
  export type DotPatternProps = v.InferOutput<typeof DotPatternPropsSchema>;
</script>

<script lang="ts">
  /**
   * DotPattern — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <DotPattern />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = DotPatternProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: DotPatternProps = $derived.by(() => {
    const rawProps: DotPatternProps = stripSvelteProps(allProps);
    const result = safeParse(DotPatternPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as DotPatternProps;
  });
</script>

<div data-slot="dot-pattern" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

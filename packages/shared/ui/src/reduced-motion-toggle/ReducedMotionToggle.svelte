<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * ReducedMotionToggle Svelte component — accessibility
   * switch letting users opt out of animations independent
   * of the OS-level prefers-reduced-motion setting.
   * Placeholder shell awaiting full implementation; ships
   * with a class prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ReducedMotionTogglePropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for ReducedMotionToggle. */
  export type ReducedMotionToggleProps = v.InferOutput<typeof ReducedMotionTogglePropsSchema>;
</script>

<script lang="ts">
  /**
   * ReducedMotionToggle — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ReducedMotionToggle />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ReducedMotionToggleProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ReducedMotionToggleProps = $derived.by(() => {
    const rawProps: ReducedMotionToggleProps = stripSvelteProps(allProps);
    const result = safeParse(ReducedMotionTogglePropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ReducedMotionToggleProps;
  });
</script>

<div data-slot="reduced-motion-toggle" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * BreakpointIndicator — dev-mode display of the current
   * Tailwind breakpoint. Placeholder shell awaiting full
   * implementation; ships with a `class` prop for root-level
   * styling overrides.
   *
   * @module
   */

  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const BreakpointIndicatorPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for BreakpointIndicator. */
  export type BreakpointIndicatorProps = v.InferOutput<typeof BreakpointIndicatorPropsSchema>;
</script>

<script lang="ts">
  /**
   * BreakpointIndicator — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <BreakpointIndicator />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = BreakpointIndicatorProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: BreakpointIndicatorProps = $derived.by(() => {
    const rawProps: BreakpointIndicatorProps = stripSvelteProps(allProps);
    const result = safeParse(BreakpointIndicatorPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as BreakpointIndicatorProps;
  });
</script>

<div data-slot="breakpoint-indicator" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

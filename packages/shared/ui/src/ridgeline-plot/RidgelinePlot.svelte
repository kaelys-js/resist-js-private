<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * RidgelinePlot Svelte component — overlapping density
   * curves for comparing distributions across categories.
   * Placeholder shell awaiting full implementation; ships
   * with a class prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const RidgelinePlotPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for RidgelinePlot. */
  export type RidgelinePlotProps = v.InferOutput<typeof RidgelinePlotPropsSchema>;
</script>

<script lang="ts">
  /**
   * RidgelinePlot — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <RidgelinePlot />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = RidgelinePlotProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: RidgelinePlotProps = $derived.by(() => {
    const rawProps: RidgelinePlotProps = stripSvelteProps(allProps);
    const result = safeParse(RidgelinePlotPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as RidgelinePlotProps;
  });
</script>

<div data-slot="ridgeline-plot" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

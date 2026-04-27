<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * BundleAnalyzer — treemap visualization of bundle module
   * sizes. Placeholder shell awaiting full implementation; ships
   * with a `class` prop for root-level styling overrides.
   *
   * @module
   */

  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const BundleAnalyzerPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for BundleAnalyzer. */
  export type BundleAnalyzerProps = v.InferOutput<typeof BundleAnalyzerPropsSchema>;
</script>

<script lang="ts">
  /**
   * BundleAnalyzer — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <BundleAnalyzer />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = BundleAnalyzerProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: BundleAnalyzerProps = $derived.by(() => {
    const rawProps: BundleAnalyzerProps = stripSvelteProps(allProps);
    const result = safeParse(BundleAnalyzerPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as BundleAnalyzerProps;
  });
</script>

<div data-slot="bundle-analyzer" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

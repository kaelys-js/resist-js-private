<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * CoverageReport — code-coverage report visualization (e.g.,
   * istanbul / vitest output). Placeholder shell awaiting full
   * implementation; ships with a `class` prop for root-level
   * styling overrides.
   *
   * @module
   */

  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const CoverageReportPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for CoverageReport. */
  export type CoverageReportProps = v.InferOutput<typeof CoverageReportPropsSchema>;
</script>

<script lang="ts">
  /**
   * CoverageReport — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <CoverageReport />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = CoverageReportProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: CoverageReportProps = $derived.by(() => {
    const rawProps: CoverageReportProps = stripSvelteProps(allProps);
    const result = safeParse(CoverageReportPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as CoverageReportProps;
  });
</script>

<div data-slot="coverage-report" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

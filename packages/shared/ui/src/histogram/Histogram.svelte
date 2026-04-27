<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const HistogramPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for Histogram. */
  export type HistogramProps = v.InferOutput<typeof HistogramPropsSchema>;
</script>

<script lang="ts">
  /**
   * Histogram — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Histogram />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = HistogramProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: HistogramProps = $derived.by(() => {
    const rawProps: HistogramProps = stripSvelteProps(allProps);
    const result = safeParse(HistogramPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as HistogramProps;
  });
</script>

<div data-slot="histogram" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

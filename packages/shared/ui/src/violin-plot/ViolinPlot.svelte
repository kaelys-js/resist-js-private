<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ViolinPlotPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type ViolinPlotProps = v.InferOutput<typeof ViolinPlotPropsSchema>;
</script>

<script lang="ts">
  /**
   * ViolinPlot — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ViolinPlot />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ViolinPlotProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ViolinPlotProps = $derived.by(() => {
    const rawProps: ViolinPlotProps = stripSvelteProps(allProps);
    const result = safeParse(ViolinPlotPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ViolinPlotProps;
  });
</script>

<div data-slot="violin-plot" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

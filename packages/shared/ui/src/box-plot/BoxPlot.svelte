<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const BoxPlotPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type BoxPlotProps = v.InferOutput<typeof BoxPlotPropsSchema>;
</script>

<script lang="ts">
  /**
   * BoxPlot — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <BoxPlot />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = BoxPlotProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: BoxPlotProps = $derived.by(() => {
    const rawProps: BoxPlotProps = stripSvelteProps(allProps);
    const result = safeParse(BoxPlotPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as BoxPlotProps;
  });
</script>

<div data-slot="box-plot" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

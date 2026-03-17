<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const DumbbellChartPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type DumbbellChartProps = v.InferOutput<typeof DumbbellChartPropsSchema>;
</script>

<script lang="ts">
  /**
   * DumbbellChart — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <DumbbellChart />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = DumbbellChartProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: DumbbellChartProps = $derived.by(() => {
    const rawProps: DumbbellChartProps = stripSvelteProps(allProps);
    const result = safeParse(DumbbellChartPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as DumbbellChartProps;
  });
</script>

<div data-slot="dumbbell-chart" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const LollipopChartPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type LollipopChartProps = v.InferOutput<typeof LollipopChartPropsSchema>;
</script>

<script lang="ts">
  /**
   * LollipopChart — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <LollipopChart />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = LollipopChartProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: LollipopChartProps = $derived.by(() => {
    const rawProps: LollipopChartProps = stripSvelteProps(allProps);
    const result = safeParse(LollipopChartPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as LollipopChartProps;
  });
</script>

<div data-slot="lollipop-chart" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

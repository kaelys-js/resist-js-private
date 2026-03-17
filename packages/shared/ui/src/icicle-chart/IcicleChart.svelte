<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const IcicleChartPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type IcicleChartProps = v.InferOutput<typeof IcicleChartPropsSchema>;
</script>

<script lang="ts">
  /**
   * IcicleChart — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <IcicleChart />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = IcicleChartProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: IcicleChartProps = $derived.by(() => {
    const rawProps: IcicleChartProps = stripSvelteProps(allProps);
    const result = safeParse(IcicleChartPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as IcicleChartProps;
  });
</script>

<div data-slot="icicle-chart" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

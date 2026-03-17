<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const HeatmapPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type HeatmapProps = v.InferOutput<typeof HeatmapPropsSchema>;
</script>

<script lang="ts">
  /**
   * Heatmap — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Heatmap />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = HeatmapProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: HeatmapProps = $derived.by(() => {
    const rawProps: HeatmapProps = stripSvelteProps(allProps);
    const result = safeParse(HeatmapPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as HeatmapProps;
  });
</script>

<div data-slot="heatmap" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

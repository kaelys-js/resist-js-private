<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const MetricCardPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for MetricCard. */
  export type MetricCardProps = v.InferOutput<typeof MetricCardPropsSchema>;
</script>

<script lang="ts">
  /**
   * MetricCard — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <MetricCard />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = MetricCardProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: MetricCardProps = $derived.by(() => {
    const rawProps: MetricCardProps = stripSvelteProps(allProps);
    const result = safeParse(MetricCardPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as MetricCardProps;
  });
</script>

<div data-slot="metric-card" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const GaugePropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type GaugeProps = v.InferOutput<typeof GaugePropsSchema>;
</script>

<script lang="ts">
  /**
   * Gauge — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Gauge />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = GaugeProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: GaugeProps = $derived.by(() => {
    const rawProps: GaugeProps = stripSvelteProps(allProps);
    const result = safeParse(GaugePropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as GaugeProps;
  });
</script>

<div data-slot="gauge" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

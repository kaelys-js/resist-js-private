<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ArcGaugePropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type ArcGaugeProps = v.InferOutput<typeof ArcGaugePropsSchema>;
</script>

<script lang="ts">
  /**
   * ArcGauge — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ArcGauge />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ArcGaugeProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ArcGaugeProps = $derived.by(() => {
    const rawProps: ArcGaugeProps = stripSvelteProps(allProps);
    const result = safeParse(ArcGaugePropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ArcGaugeProps;
  });
</script>

<div data-slot="arc-gauge" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * LinearGauge Svelte component — horizontal bar progress
   * gauge for showing a value within a range. Placeholder shell
   * awaiting full implementation; ships with a class prop for
   * root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const LinearGaugePropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for LinearGauge. */
  export type LinearGaugeProps = v.InferOutput<typeof LinearGaugePropsSchema>;
</script>

<script lang="ts">
  /**
   * LinearGauge — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <LinearGauge />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = LinearGaugeProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: LinearGaugeProps = $derived.by(() => {
    const rawProps: LinearGaugeProps = stripSvelteProps(allProps);
    const result = safeParse(LinearGaugePropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as LinearGaugeProps;
  });
</script>

<div data-slot="linear-gauge" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

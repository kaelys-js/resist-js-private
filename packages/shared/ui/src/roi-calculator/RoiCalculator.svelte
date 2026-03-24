<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const RoiCalculatorPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type RoiCalculatorProps = v.InferOutput<typeof RoiCalculatorPropsSchema>;
</script>

<script lang="ts">
  /**
   * RoiCalculator — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <RoiCalculator />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = RoiCalculatorProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: RoiCalculatorProps = $derived.by(() => {
    const rawProps: RoiCalculatorProps = stripSvelteProps(allProps);
    const result = safeParse(RoiCalculatorPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as RoiCalculatorProps;
  });
</script>

<div data-slot="roi-calculator" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

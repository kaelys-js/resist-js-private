<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const BmiCalculatorPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type BmiCalculatorProps = v.InferOutput<typeof BmiCalculatorPropsSchema>;
</script>

<script lang="ts">
  /**
   * BmiCalculator — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <BmiCalculator />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = BmiCalculatorProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: BmiCalculatorProps = $derived.by(() => {
    const rawProps: BmiCalculatorProps = stripSvelteProps(allProps);
    const result = safeParse(BmiCalculatorPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as BmiCalculatorProps;
  });
</script>

<div data-slot="bmi-calculator" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

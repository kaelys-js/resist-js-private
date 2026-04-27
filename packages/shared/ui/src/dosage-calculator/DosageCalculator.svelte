<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const DosageCalculatorPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for DosageCalculator. */
  export type DosageCalculatorProps = v.InferOutput<typeof DosageCalculatorPropsSchema>;
</script>

<script lang="ts">
  /**
   * DosageCalculator — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <DosageCalculator />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = DosageCalculatorProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: DosageCalculatorProps = $derived.by(() => {
    const rawProps: DosageCalculatorProps = stripSvelteProps(allProps);
    const result = safeParse(DosageCalculatorPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as DosageCalculatorProps;
  });
</script>

<div data-slot="dosage-calculator" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

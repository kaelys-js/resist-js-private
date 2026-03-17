<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const AmortizationTablePropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type AmortizationTableProps = v.InferOutput<typeof AmortizationTablePropsSchema>;
</script>

<script lang="ts">
  /**
   * AmortizationTable — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <AmortizationTable />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = AmortizationTableProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: AmortizationTableProps = $derived.by(() => {
    const rawProps: AmortizationTableProps = stripSvelteProps(allProps);
    const result = safeParse(AmortizationTablePropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as AmortizationTableProps;
  });
</script>

<div data-slot="amortization-table" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

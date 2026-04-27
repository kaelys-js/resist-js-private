<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const PricingTablePropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for PricingTable. */
  export type PricingTableProps = v.InferOutput<typeof PricingTablePropsSchema>;
</script>

<script lang="ts">
  /**
   * PricingTable — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <PricingTable />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = PricingTableProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: PricingTableProps = $derived.by(() => {
    const rawProps: PricingTableProps = stripSvelteProps(allProps);
    const result = safeParse(PricingTablePropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as PricingTableProps;
  });
</script>

<div data-slot="pricing-table" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

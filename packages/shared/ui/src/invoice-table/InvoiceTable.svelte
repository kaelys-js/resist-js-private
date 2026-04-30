<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * InvoiceTable Svelte component — itemized invoice line-item
   * table with totals row. Placeholder shell awaiting full
   * implementation; ships with a class prop for root-level
   * styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const InvoiceTablePropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for InvoiceTable. */
  export type InvoiceTableProps = v.InferOutput<typeof InvoiceTablePropsSchema>;
</script>

<script lang="ts">
  /**
   * InvoiceTable — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <InvoiceTable />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = InvoiceTableProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: InvoiceTableProps = $derived.by(() => {
    const rawProps: InvoiceTableProps = stripSvelteProps(allProps);
    const result = safeParse(InvoiceTablePropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as InvoiceTableProps;
  });
</script>

<div data-slot="invoice-table" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

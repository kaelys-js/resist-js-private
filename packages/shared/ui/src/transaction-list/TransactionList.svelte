<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * TransactionList Svelte component — chronological list of
   * debits / credits with running balances. Placeholder shell
   * awaiting full implementation; ships with a class prop
   * for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const TransactionListPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for TransactionList. */
  export type TransactionListProps = v.InferOutput<typeof TransactionListPropsSchema>;
</script>

<script lang="ts">
  /**
   * TransactionList — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <TransactionList />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = TransactionListProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: TransactionListProps = $derived.by(() => {
    const rawProps: TransactionListProps = stripSvelteProps(allProps);
    const result = safeParse(TransactionListPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as TransactionListProps;
  });
</script>

<div data-slot="transaction-list" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

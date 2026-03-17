<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const BillingHistoryPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type BillingHistoryProps = v.InferOutput<typeof BillingHistoryPropsSchema>;
</script>

<script lang="ts">
  /**
   * BillingHistory — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <BillingHistory />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = BillingHistoryProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: BillingHistoryProps = $derived.by(() => {
    const rawProps: BillingHistoryProps = stripSvelteProps(allProps);
    const result = safeParse(BillingHistoryPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as BillingHistoryProps;
  });
</script>

<div data-slot="billing-history" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const BankAccountCardPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type BankAccountCardProps = v.InferOutput<typeof BankAccountCardPropsSchema>;
</script>

<script lang="ts">
  /**
   * BankAccountCard — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <BankAccountCard />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = BankAccountCardProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: BankAccountCardProps = $derived.by(() => {
    const rawProps: BankAccountCardProps = stripSvelteProps(allProps);
    const result = safeParse(BankAccountCardPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as BankAccountCardProps;
  });
</script>

<div data-slot="bank-account-card" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

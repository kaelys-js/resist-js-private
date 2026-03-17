<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const AccountBalancePropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type AccountBalanceProps = v.InferOutput<typeof AccountBalancePropsSchema>;
</script>

<script lang="ts">
  /**
   * AccountBalance — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <AccountBalance />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = AccountBalanceProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: AccountBalanceProps = $derived.by(() => {
    const rawProps: AccountBalanceProps = stripSvelteProps(allProps);
    const result = safeParse(AccountBalancePropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as AccountBalanceProps;
  });
</script>

<div data-slot="account-balance" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

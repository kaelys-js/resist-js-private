<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ExpenseCategoryPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for ExpenseCategory. */
  export type ExpenseCategoryProps = v.InferOutput<typeof ExpenseCategoryPropsSchema>;
</script>

<script lang="ts">
  /**
   * ExpenseCategory — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ExpenseCategory />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ExpenseCategoryProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ExpenseCategoryProps = $derived.by(() => {
    const rawProps: ExpenseCategoryProps = stripSvelteProps(allProps);
    const result = safeParse(ExpenseCategoryPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ExpenseCategoryProps;
  });
</script>

<div data-slot="expense-category" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

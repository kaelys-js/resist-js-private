<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ReceiptPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type ReceiptProps = v.InferOutput<typeof ReceiptPropsSchema>;
</script>

<script lang="ts">
  /**
   * Receipt — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Receipt />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ReceiptProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ReceiptProps = $derived.by(() => {
    const rawProps: ReceiptProps = stripSvelteProps(allProps);
    const result = safeParse(ReceiptPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ReceiptProps;
  });
</script>

<div data-slot="receipt" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

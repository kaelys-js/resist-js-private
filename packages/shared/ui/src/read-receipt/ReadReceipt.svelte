<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * ReadReceipt Svelte component — small status indicator
   * showing whether a message has been delivered or read.
   * Placeholder shell awaiting full implementation; ships with
   * a class prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ReadReceiptPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for ReadReceipt. */
  export type ReadReceiptProps = v.InferOutput<typeof ReadReceiptPropsSchema>;
</script>

<script lang="ts">
  /**
   * ReadReceipt — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ReadReceipt />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ReadReceiptProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ReadReceiptProps = $derived.by(() => {
    const rawProps: ReadReceiptProps = stripSvelteProps(allProps);
    const result = safeParse(ReadReceiptPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ReadReceiptProps;
  });
</script>

<div data-slot="read-receipt" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * Transfer Svelte component — dual-list shuttle for moving
   * items between source and target columns. Placeholder
   * shell awaiting full implementation; ships with a class
   * prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const TransferPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for Transfer. */
  export type TransferProps = v.InferOutput<typeof TransferPropsSchema>;
</script>

<script lang="ts">
  /**
   * Transfer — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Transfer />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = TransferProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: TransferProps = $derived.by(() => {
    const rawProps: TransferProps = stripSvelteProps(allProps);
    const result = safeParse(TransferPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as TransferProps;
  });
</script>

<div data-slot="transfer" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

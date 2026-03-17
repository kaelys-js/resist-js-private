<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const BulkEditPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type BulkEditProps = v.InferOutput<typeof BulkEditPropsSchema>;
</script>

<script lang="ts">
  /**
   * BulkEdit — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <BulkEdit />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = BulkEditProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: BulkEditProps = $derived.by(() => {
    const rawProps: BulkEditProps = stripSvelteProps(allProps);
    const result = safeParse(BulkEditPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as BulkEditProps;
  });
</script>

<div data-slot="bulk-edit" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

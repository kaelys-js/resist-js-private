<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const BulkActionBarPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type BulkActionBarProps = v.InferOutput<typeof BulkActionBarPropsSchema>;
</script>

<script lang="ts">
  /**
   * BulkActionBar — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <BulkActionBar />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = BulkActionBarProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: BulkActionBarProps = $derived.by(() => {
    const rawProps: BulkActionBarProps = stripSvelteProps(allProps);
    const result = safeParse(BulkActionBarPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as BulkActionBarProps;
  });
</script>

<div data-slot="bulk-action-bar" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

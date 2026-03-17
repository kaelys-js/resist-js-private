<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const BranchSelectorPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type BranchSelectorProps = v.InferOutput<typeof BranchSelectorPropsSchema>;
</script>

<script lang="ts">
  /**
   * BranchSelector — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <BranchSelector />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = BranchSelectorProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: BranchSelectorProps = $derived.by(() => {
    const rawProps: BranchSelectorProps = stripSvelteProps(allProps);
    const result = safeParse(BranchSelectorPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as BranchSelectorProps;
  });
</script>

<div data-slot="branch-selector" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

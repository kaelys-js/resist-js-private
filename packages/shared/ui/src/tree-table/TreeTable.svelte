<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const TreeTablePropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for TreeTable. */
  export type TreeTableProps = v.InferOutput<typeof TreeTablePropsSchema>;
</script>

<script lang="ts">
  /**
   * TreeTable — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <TreeTable />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = TreeTableProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: TreeTableProps = $derived.by(() => {
    const rawProps: TreeTableProps = stripSvelteProps(allProps);
    const result = safeParse(TreeTablePropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as TreeTableProps;
  });
</script>

<div data-slot="tree-table" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

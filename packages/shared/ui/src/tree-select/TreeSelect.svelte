<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * TreeSelect Svelte component — dropdown selector showing
   * options as an expandable tree (combines TreeView +
   * Select). Placeholder shell awaiting full implementation;
   * ships with a class prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const TreeSelectPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for TreeSelect. */
  export type TreeSelectProps = v.InferOutput<typeof TreeSelectPropsSchema>;
</script>

<script lang="ts">
  /**
   * TreeSelect — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <TreeSelect />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = TreeSelectProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: TreeSelectProps = $derived.by(() => {
    const rawProps: TreeSelectProps = stripSvelteProps(allProps);
    const result = safeParse(TreeSelectPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as TreeSelectProps;
  });
</script>

<div data-slot="tree-select" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

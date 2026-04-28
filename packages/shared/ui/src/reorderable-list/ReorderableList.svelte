<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * ReorderableList Svelte component — drag-and-drop sortable
   * list with handle-based reordering. Placeholder shell
   * awaiting full implementation; ships with a class prop
   * for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ReorderableListPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for ReorderableList. */
  export type ReorderableListProps = v.InferOutput<typeof ReorderableListPropsSchema>;
</script>

<script lang="ts">
  /**
   * ReorderableList — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ReorderableList />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ReorderableListProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ReorderableListProps = $derived.by(() => {
    const rawProps: ReorderableListProps = stripSvelteProps(allProps);
    const result = safeParse(ReorderableListPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ReorderableListProps;
  });
</script>

<div data-slot="reorderable-list" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * TableOfContents Svelte component — auto-generated nav
   * list of page headings that highlights the currently
   * visible section. Placeholder shell awaiting full
   * implementation; ships with a class prop for root-level
   * styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const TableOfContentsPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for TableOfContents. */
  export type TableOfContentsProps = v.InferOutput<typeof TableOfContentsPropsSchema>;
</script>

<script lang="ts">
  /**
   * TableOfContents — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <TableOfContents />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = TableOfContentsProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: TableOfContentsProps = $derived.by(() => {
    const rawProps: TableOfContentsProps = stripSvelteProps(allProps);
    const result = safeParse(TableOfContentsPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as TableOfContentsProps;
  });
</script>

<div data-slot="table-of-contents" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * QueryEditor Svelte component — text editor surface for
   * authoring SQL or GraphQL queries with syntax styling
   * hooks. Placeholder shell awaiting full implementation;
   * ships with a class prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const QueryEditorPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for QueryEditor. */
  export type QueryEditorProps = v.InferOutput<typeof QueryEditorPropsSchema>;
</script>

<script lang="ts">
  /**
   * QueryEditor — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <QueryEditor />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = QueryEditorProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: QueryEditorProps = $derived.by(() => {
    const rawProps: QueryEditorProps = stripSvelteProps(allProps);
    const result = safeParse(QueryEditorPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as QueryEditorProps;
  });
</script>

<div data-slot="query-editor" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

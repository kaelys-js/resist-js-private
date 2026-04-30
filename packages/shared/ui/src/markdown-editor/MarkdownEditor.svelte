<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * MarkdownEditor Svelte component — Markdown text editor
   * with live preview. Placeholder shell awaiting full
   * implementation; ships with a class prop for root-level
   * styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const MarkdownEditorPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for MarkdownEditor. */
  export type MarkdownEditorProps = v.InferOutput<typeof MarkdownEditorPropsSchema>;
</script>

<script lang="ts">
  /**
   * MarkdownEditor — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <MarkdownEditor />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = MarkdownEditorProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: MarkdownEditorProps = $derived.by(() => {
    const rawProps: MarkdownEditorProps = stripSvelteProps(allProps);
    const result = safeParse(MarkdownEditorPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as MarkdownEditorProps;
  });
</script>

<div data-slot="markdown-editor" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

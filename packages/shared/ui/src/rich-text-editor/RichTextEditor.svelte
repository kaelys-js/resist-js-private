<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const RichTextEditorPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type RichTextEditorProps = v.InferOutput<typeof RichTextEditorPropsSchema>;
</script>

<script lang="ts">
  /**
   * RichTextEditor — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <RichTextEditor />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = RichTextEditorProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: RichTextEditorProps = $derived.by(() => {
    const rawProps: RichTextEditorProps = stripSvelteProps(allProps);
    const result = safeParse(RichTextEditorPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as RichTextEditorProps;
  });
</script>

<div data-slot="rich-text-editor" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

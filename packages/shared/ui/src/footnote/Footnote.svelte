<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * Footnote Svelte component — inline footnote reference
   * with hover-to-reveal note content. Placeholder shell
   * awaiting full implementation; ships with a class prop for
   * root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const FootnotePropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for Footnote. */
  export type FootnoteProps = v.InferOutput<typeof FootnotePropsSchema>;
</script>

<script lang="ts">
  /**
   * Footnote — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Footnote />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = FootnoteProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: FootnoteProps = $derived.by(() => {
    const rawProps: FootnoteProps = stripSvelteProps(allProps);
    const result = safeParse(FootnotePropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as FootnoteProps;
  });
</script>

<div data-slot="footnote" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

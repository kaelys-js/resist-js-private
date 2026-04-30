<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * ContentBlock — flexible content block with title / image /
   * body slots for marketing pages. Placeholder shell awaiting
   * full implementation; ships with a `class` prop for
   * root-level styling overrides.
   *
   * @module
   */

  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ContentBlockPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for ContentBlock. */
  export type ContentBlockProps = v.InferOutput<typeof ContentBlockPropsSchema>;
</script>

<script lang="ts">
  /**
   * ContentBlock — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ContentBlock />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ContentBlockProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ContentBlockProps = $derived.by(() => {
    const rawProps: ContentBlockProps = stripSvelteProps(allProps);
    const result = safeParse(ContentBlockPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ContentBlockProps;
  });
</script>

<div data-slot="content-block" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

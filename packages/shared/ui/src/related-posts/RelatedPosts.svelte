<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * RelatedPosts Svelte component — grid of related-article
   * card links shown at the end of a blog post. Placeholder
   * shell awaiting full implementation; ships with a class
   * prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const RelatedPostsPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for RelatedPosts. */
  export type RelatedPostsProps = v.InferOutput<typeof RelatedPostsPropsSchema>;
</script>

<script lang="ts">
  /**
   * RelatedPosts — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <RelatedPosts />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = RelatedPostsProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: RelatedPostsProps = $derived.by(() => {
    const rawProps: RelatedPostsProps = stripSvelteProps(allProps);
    const result = safeParse(RelatedPostsPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as RelatedPostsProps;
  });
</script>

<div data-slot="related-posts" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

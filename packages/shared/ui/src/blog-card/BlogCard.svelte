<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * BlogCard — blog post preview card with title, image, and
   * excerpt. Placeholder shell awaiting full implementation;
   * ships with a `class` prop for root-level styling overrides.
   *
   * @module
   */

  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const BlogCardPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for BlogCard. */
  export type BlogCardProps = v.InferOutput<typeof BlogCardPropsSchema>;
</script>

<script lang="ts">
  /**
   * BlogCard — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <BlogCard />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = BlogCardProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: BlogCardProps = $derived.by(() => {
    const rawProps: BlogCardProps = stripSvelteProps(allProps);
    const result = safeParse(BlogCardPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as BlogCardProps;
  });
</script>

<div data-slot="blog-card" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

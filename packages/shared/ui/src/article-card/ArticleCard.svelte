<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ArticleCardPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type ArticleCardProps = v.InferOutput<typeof ArticleCardPropsSchema>;
</script>

<script lang="ts">
  /**
   * ArticleCard — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ArticleCard />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ArticleCardProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ArticleCardProps = $derived.by(() => {
    const rawProps: ArticleCardProps = stripSvelteProps(allProps);
    const result = safeParse(ArticleCardPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ArticleCardProps;
  });
</script>

<div data-slot="article-card" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

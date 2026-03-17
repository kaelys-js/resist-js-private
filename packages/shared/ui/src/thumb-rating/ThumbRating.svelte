<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ThumbRatingPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type ThumbRatingProps = v.InferOutput<typeof ThumbRatingPropsSchema>;
</script>

<script lang="ts">
  /**
   * ThumbRating — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ThumbRating />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ThumbRatingProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ThumbRatingProps = $derived.by(() => {
    const rawProps: ThumbRatingProps = stripSvelteProps(allProps);
    const result = safeParse(ThumbRatingPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ThumbRatingProps;
  });
</script>

<div data-slot="thumb-rating" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * Hashtag Svelte component — clickable hashtag link styled
   * for social-content surfaces. Placeholder shell awaiting full
   * implementation; ships with a class prop for root-level
   * styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const HashtagPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for Hashtag. */
  export type HashtagProps = v.InferOutput<typeof HashtagPropsSchema>;
</script>

<script lang="ts">
  /**
   * Hashtag — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Hashtag />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = HashtagProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: HashtagProps = $derived.by(() => {
    const rawProps: HashtagProps = stripSvelteProps(allProps);
    const result = safeParse(HashtagPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as HashtagProps;
  });
</script>

<div data-slot="hashtag" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

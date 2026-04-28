<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * Highlight Svelte component — wraps matching substrings of
   * a given text in a `<mark>` element for search-result
   * display. Placeholder shell awaiting full implementation;
   * ships with a class prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const HighlightPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for Highlight. */
  export type HighlightProps = v.InferOutput<typeof HighlightPropsSchema>;
</script>

<script lang="ts">
  /**
   * Highlight — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Highlight />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = HighlightProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: HighlightProps = $derived.by(() => {
    const rawProps: HighlightProps = stripSvelteProps(allProps);
    const result = safeParse(HighlightPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as HighlightProps;
  });
</script>

<div data-slot="highlight" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

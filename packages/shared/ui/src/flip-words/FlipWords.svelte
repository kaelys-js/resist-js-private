<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const FlipWordsPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for FlipWords. */
  export type FlipWordsProps = v.InferOutput<typeof FlipWordsPropsSchema>;
</script>

<script lang="ts">
  /**
   * FlipWords — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <FlipWords />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = FlipWordsProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: FlipWordsProps = $derived.by(() => {
    const rawProps: FlipWordsProps = stripSvelteProps(allProps);
    const result = safeParse(FlipWordsPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as FlipWordsProps;
  });
</script>

<div data-slot="flip-words" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

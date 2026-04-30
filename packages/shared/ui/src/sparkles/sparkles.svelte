<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * Sparkles Svelte component — animated sparkle/star
   * particles that twinkle around or within content for
   * decorative emphasis. Placeholder shell awaiting full
   * implementation; ships with a class prop for root-level
   * styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const SparklesPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for Sparkles. */
  export type SparklesProps = v.InferOutput<typeof SparklesPropsSchema>;
</script>

<script lang="ts">
  /**
   * Sparkles — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Sparkles />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = SparklesProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: SparklesProps = $derived.by(() => {
    const rawProps: SparklesProps = stripSvelteProps(allProps);
    const result = safeParse(SparklesPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as SparklesProps;
  });
</script>

<div data-slot="sparkles" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

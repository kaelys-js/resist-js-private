<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * MorphingText Svelte component — text that smoothly morphs
   * between phrases. Placeholder shell awaiting full
   * implementation; ships with a class prop for root-level
   * styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const MorphingTextPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for MorphingText. */
  export type MorphingTextProps = v.InferOutput<typeof MorphingTextPropsSchema>;
</script>

<script lang="ts">
  /**
   * MorphingText — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <MorphingText />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = MorphingTextProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: MorphingTextProps = $derived.by(() => {
    const rawProps: MorphingTextProps = stripSvelteProps(allProps);
    const result = safeParse(MorphingTextPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as MorphingTextProps;
  });
</script>

<div data-slot="morphing-text" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

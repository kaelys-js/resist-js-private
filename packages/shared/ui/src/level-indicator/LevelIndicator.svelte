<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * LevelIndicator Svelte component — current level display
   * (e.g. RPG character level). Placeholder shell awaiting full
   * implementation; ships with a class prop for root-level
   * styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const LevelIndicatorPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for LevelIndicator. */
  export type LevelIndicatorProps = v.InferOutput<typeof LevelIndicatorPropsSchema>;
</script>

<script lang="ts">
  /**
   * LevelIndicator — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <LevelIndicator />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = LevelIndicatorProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: LevelIndicatorProps = $derived.by(() => {
    const rawProps: LevelIndicatorProps = stripSvelteProps(allProps);
    const result = safeParse(LevelIndicatorPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as LevelIndicatorProps;
  });
</script>

<div data-slot="level-indicator" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * ComboCounter — game-style combo counter showing successive
   * action streaks. Placeholder shell awaiting full
   * implementation; ships with a `class` prop for root-level
   * styling overrides.
   *
   * @module
   */

  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ComboCounterPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for ComboCounter. */
  export type ComboCounterProps = v.InferOutput<typeof ComboCounterPropsSchema>;
</script>

<script lang="ts">
  /**
   * ComboCounter — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ComboCounter />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ComboCounterProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ComboCounterProps = $derived.by(() => {
    const rawProps: ComboCounterProps = stripSvelteProps(allProps);
    const result = safeParse(ComboCounterPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ComboCounterProps;
  });
</script>

<div data-slot="combo-counter" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

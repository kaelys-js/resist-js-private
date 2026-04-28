<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * HighContrastToggle Svelte component — accessibility toggle
   * for high-contrast theme mode. Placeholder shell awaiting
   * full implementation; ships with a class prop for root-level
   * styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const HighContrastTogglePropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for HighContrastToggle. */
  export type HighContrastToggleProps = v.InferOutput<typeof HighContrastTogglePropsSchema>;
</script>

<script lang="ts">
  /**
   * HighContrastToggle — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <HighContrastToggle />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = HighContrastToggleProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: HighContrastToggleProps = $derived.by(() => {
    const rawProps: HighContrastToggleProps = stripSvelteProps(allProps);
    const result = safeParse(HighContrastTogglePropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as HighContrastToggleProps;
  });
</script>

<div data-slot="high-contrast-toggle" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

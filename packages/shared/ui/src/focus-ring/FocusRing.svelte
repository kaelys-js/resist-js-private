<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * FocusRing Svelte component — custom keyboard-focus ring
   * indicator for accessibility. Placeholder shell awaiting full
   * implementation; ships with a class prop for root-level
   * styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const FocusRingPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for FocusRing. */
  export type FocusRingProps = v.InferOutput<typeof FocusRingPropsSchema>;
</script>

<script lang="ts">
  /**
   * FocusRing — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <FocusRing />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = FocusRingProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: FocusRingProps = $derived.by(() => {
    const rawProps: FocusRingProps = stripSvelteProps(allProps);
    const result = safeParse(FocusRingPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as FocusRingProps;
  });
</script>

<div data-slot="focus-ring" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

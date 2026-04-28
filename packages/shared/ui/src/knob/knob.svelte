<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * Knob Svelte component — circular dial / rotary control for
   * selecting numeric values. Placeholder shell awaiting full
   * implementation; ships with a class prop for root-level
   * styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const KnobPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for Knob. */
  export type KnobProps = v.InferOutput<typeof KnobPropsSchema>;
</script>

<script lang="ts">
  /**
   * Knob — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Knob />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = KnobProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: KnobProps = $derived.by(() => {
    const rawProps: KnobProps = stripSvelteProps(allProps);
    const result = safeParse(KnobPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as KnobProps;
  });
</script>

<div data-slot="knob" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

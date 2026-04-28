<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * MobileStepper Svelte component — bottom-of-screen
   * stepper for mobile workflows (dot / progress style).
   * Placeholder shell awaiting full implementation; ships with a
   * class prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const MobileStepperPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for MobileStepper. */
  export type MobileStepperProps = v.InferOutput<typeof MobileStepperPropsSchema>;
</script>

<script lang="ts">
  /**
   * MobileStepper — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <MobileStepper />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = MobileStepperProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: MobileStepperProps = $derived.by(() => {
    const rawProps: MobileStepperProps = stripSvelteProps(allProps);
    const result = safeParse(MobileStepperPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as MobileStepperProps;
  });
</script>

<div data-slot="mobile-stepper" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

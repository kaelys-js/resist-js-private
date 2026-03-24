<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const StepperPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type StepperProps = v.InferOutput<typeof StepperPropsSchema>;
</script>

<script lang="ts">
  /**
   * Stepper — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Stepper />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = StepperProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: StepperProps = $derived.by(() => {
    const rawProps: StepperProps = stripSvelteProps(allProps);
    const result = safeParse(StepperPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as StepperProps;
  });
</script>

<div data-slot="stepper" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

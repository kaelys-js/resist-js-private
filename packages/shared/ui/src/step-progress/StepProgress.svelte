<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const StepProgressPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type StepProgressProps = v.InferOutput<typeof StepProgressPropsSchema>;
</script>

<script lang="ts">
  /**
   * StepProgress — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <StepProgress />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = StepProgressProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: StepProgressProps = $derived.by(() => {
    const rawProps: StepProgressProps = stripSvelteProps(allProps);
    const result = safeParse(StepProgressPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as StepProgressProps;
  });
</script>

<div data-slot="step-progress" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

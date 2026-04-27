<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const MultiStepLoaderPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for MultiStepLoader. */
  export type MultiStepLoaderProps = v.InferOutput<typeof MultiStepLoaderPropsSchema>;
</script>

<script lang="ts">
  /**
   * MultiStepLoader — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <MultiStepLoader />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = MultiStepLoaderProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: MultiStepLoaderProps = $derived.by(() => {
    const rawProps: MultiStepLoaderProps = stripSvelteProps(allProps);
    const result = safeParse(MultiStepLoaderPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as MultiStepLoaderProps;
  });
</script>

<div data-slot="multi-step-loader" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

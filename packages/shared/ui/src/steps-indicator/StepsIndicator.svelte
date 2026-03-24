<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const StepsIndicatorPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type StepsIndicatorProps = v.InferOutput<typeof StepsIndicatorPropsSchema>;
</script>

<script lang="ts">
  /**
   * StepsIndicator — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <StepsIndicator />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = StepsIndicatorProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: StepsIndicatorProps = $derived.by(() => {
    const rawProps: StepsIndicatorProps = stripSvelteProps(allProps);
    const result = safeParse(StepsIndicatorPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as StepsIndicatorProps;
  });
</script>

<div data-slot="steps-indicator" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const StreakCounterPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type StreakCounterProps = v.InferOutput<typeof StreakCounterPropsSchema>;
</script>

<script lang="ts">
  /**
   * StreakCounter — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <StreakCounter />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = StreakCounterProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: StreakCounterProps = $derived.by(() => {
    const rawProps: StreakCounterProps = stripSvelteProps(allProps);
    const result = safeParse(StreakCounterPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as StreakCounterProps;
  });
</script>

<div data-slot="streak-counter" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const TimerDisplayPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for TimerDisplay. */
  export type TimerDisplayProps = v.InferOutput<typeof TimerDisplayPropsSchema>;
</script>

<script lang="ts">
  /**
   * TimerDisplay — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <TimerDisplay />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = TimerDisplayProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: TimerDisplayProps = $derived.by(() => {
    const rawProps: TimerDisplayProps = stripSvelteProps(allProps);
    const result = safeParse(TimerDisplayPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as TimerDisplayProps;
  });
</script>

<div data-slot="timer-display" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

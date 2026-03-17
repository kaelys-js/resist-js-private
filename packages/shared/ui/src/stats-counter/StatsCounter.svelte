<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const StatsCounterPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type StatsCounterProps = v.InferOutput<typeof StatsCounterPropsSchema>;
</script>

<script lang="ts">
  /**
   * StatsCounter — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <StatsCounter />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = StatsCounterProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: StatsCounterProps = $derived.by(() => {
    const rawProps: StatsCounterProps = stripSvelteProps(allProps);
    const result = safeParse(StatsCounterPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as StatsCounterProps;
  });
</script>

<div data-slot="stats-counter" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

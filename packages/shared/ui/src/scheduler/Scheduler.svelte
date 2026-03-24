<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const SchedulerPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type SchedulerProps = v.InferOutput<typeof SchedulerPropsSchema>;
</script>

<script lang="ts">
  /**
   * Scheduler — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Scheduler />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = SchedulerProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: SchedulerProps = $derived.by(() => {
    const rawProps: SchedulerProps = stripSvelteProps(allProps);
    const result = safeParse(SchedulerPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as SchedulerProps;
  });
</script>

<div data-slot="scheduler" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const AttendanceTrackerPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type AttendanceTrackerProps = v.InferOutput<typeof AttendanceTrackerPropsSchema>;
</script>

<script lang="ts">
  /**
   * AttendanceTracker — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <AttendanceTracker />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = AttendanceTrackerProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: AttendanceTrackerProps = $derived.by(() => {
    const rawProps: AttendanceTrackerProps = stripSvelteProps(allProps);
    const result = safeParse(AttendanceTrackerPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as AttendanceTrackerProps;
  });
</script>

<div data-slot="attendance-tracker" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

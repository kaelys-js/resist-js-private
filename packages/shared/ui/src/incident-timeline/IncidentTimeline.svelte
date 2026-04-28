<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * IncidentTimeline Svelte component — chronological timeline
   * of incident updates with status transitions. Placeholder
   * shell awaiting full implementation; ships with a class prop
   * for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const IncidentTimelinePropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for IncidentTimeline. */
  export type IncidentTimelineProps = v.InferOutput<typeof IncidentTimelinePropsSchema>;
</script>

<script lang="ts">
  /**
   * IncidentTimeline — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <IncidentTimeline />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = IncidentTimelineProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: IncidentTimelineProps = $derived.by(() => {
    const rawProps: IncidentTimelineProps = stripSvelteProps(allProps);
    const result = safeParse(IncidentTimelinePropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as IncidentTimelineProps;
  });
</script>

<div data-slot="incident-timeline" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

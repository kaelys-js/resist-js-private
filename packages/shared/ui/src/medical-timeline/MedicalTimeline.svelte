<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * MedicalTimeline Svelte component — patient medical event
   * timeline. Placeholder shell awaiting full implementation;
   * ships with a class prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const MedicalTimelinePropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for MedicalTimeline. */
  export type MedicalTimelineProps = v.InferOutput<typeof MedicalTimelinePropsSchema>;
</script>

<script lang="ts">
  /**
   * MedicalTimeline — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <MedicalTimeline />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = MedicalTimelineProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: MedicalTimelineProps = $derived.by(() => {
    const rawProps: MedicalTimelineProps = stripSvelteProps(allProps);
    const result = safeParse(MedicalTimelinePropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as MedicalTimelineProps;
  });
</script>

<div data-slot="medical-timeline" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

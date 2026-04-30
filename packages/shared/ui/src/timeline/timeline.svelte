<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * Timeline Svelte component — vertical or horizontal
   * sequence of chronological events / steps. Placeholder
   * shell awaiting full implementation; ships with a class
   * prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const TimelinePropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for Timeline. */
  export type TimelineProps = v.InferOutput<typeof TimelinePropsSchema>;
</script>

<script lang="ts">
  /**
   * Timeline — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Timeline />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = TimelineProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: TimelineProps = $derived.by(() => {
    const rawProps: TimelineProps = stripSvelteProps(allProps);
    const result = safeParse(TimelinePropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as TimelineProps;
  });
</script>

<div data-slot="timeline" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

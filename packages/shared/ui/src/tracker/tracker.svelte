<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * Tracker Svelte component — uptime-style status grid /
   * heatmap of recent activity. Placeholder shell awaiting
   * full implementation; ships with a class prop for
   * root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const TrackerPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for Tracker. */
  export type TrackerProps = v.InferOutput<typeof TrackerPropsSchema>;
</script>

<script lang="ts">
  /**
   * Tracker — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Tracker />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = TrackerProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: TrackerProps = $derived.by(() => {
    const rawProps: TrackerProps = stripSvelteProps(allProps);
    const result = safeParse(TrackerPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as TrackerProps;
  });
</script>

<div data-slot="tracker" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

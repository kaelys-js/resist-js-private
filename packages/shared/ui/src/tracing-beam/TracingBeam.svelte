<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * TracingBeam Svelte component — animated SVG path that
   * traces alongside long-form content as the reader scrolls.
   * Placeholder shell awaiting full implementation; ships
   * with a class prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const TracingBeamPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for TracingBeam. */
  export type TracingBeamProps = v.InferOutput<typeof TracingBeamPropsSchema>;
</script>

<script lang="ts">
  /**
   * TracingBeam — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <TracingBeam />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = TracingBeamProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: TracingBeamProps = $derived.by(() => {
    const rawProps: TracingBeamProps = stripSvelteProps(allProps);
    const result = safeParse(TracingBeamPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as TracingBeamProps;
  });
</script>

<div data-slot="tracing-beam" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

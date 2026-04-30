<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * IdleDetector Svelte component — detects user inactivity /
   * away state and emits idle events. Placeholder shell awaiting
   * full implementation; ships with a class prop for root-level
   * styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const IdleDetectorPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for IdleDetector. */
  export type IdleDetectorProps = v.InferOutput<typeof IdleDetectorPropsSchema>;
</script>

<script lang="ts">
  /**
   * IdleDetector — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <IdleDetector />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = IdleDetectorProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: IdleDetectorProps = $derived.by(() => {
    const rawProps: IdleDetectorProps = stripSvelteProps(allProps);
    const result = safeParse(IdleDetectorPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as IdleDetectorProps;
  });
</script>

<div data-slot="idle-detector" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

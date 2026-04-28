<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * LongPress Svelte component — wrapper that detects
   * long-press gestures and emits an event. Placeholder shell
   * awaiting full implementation; ships with a class prop for
   * root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const LongPressPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for LongPress. */
  export type LongPressProps = v.InferOutput<typeof LongPressPropsSchema>;
</script>

<script lang="ts">
  /**
   * LongPress — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <LongPress />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = LongPressProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: LongPressProps = $derived.by(() => {
    const rawProps: LongPressProps = stripSvelteProps(allProps);
    const result = safeParse(LongPressPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as LongPressProps;
  });
</script>

<div data-slot="long-press" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * ScreenRecorder Svelte component — wrapper around the
   * browser screen-capture API for in-app recording flows.
   * Placeholder shell awaiting full implementation; ships
   * with a class prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ScreenRecorderPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for ScreenRecorder. */
  export type ScreenRecorderProps = v.InferOutput<typeof ScreenRecorderPropsSchema>;
</script>

<script lang="ts">
  /**
   * ScreenRecorder — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ScreenRecorder />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ScreenRecorderProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ScreenRecorderProps = $derived.by(() => {
    const rawProps: ScreenRecorderProps = stripSvelteProps(allProps);
    const result = safeParse(ScreenRecorderPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ScreenRecorderProps;
  });
</script>

<div data-slot="screen-recorder" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

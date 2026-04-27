<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * CircularProgress — ring-style percentage progress indicator.
   * Placeholder shell awaiting full implementation; ships with a
   * `class` prop for root-level styling overrides.
   *
   * @module
   */

  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const CircularProgressPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for CircularProgress. */
  export type CircularProgressProps = v.InferOutput<typeof CircularProgressPropsSchema>;
</script>

<script lang="ts">
  /**
   * CircularProgress — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <CircularProgress />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = CircularProgressProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: CircularProgressProps = $derived.by(() => {
    const rawProps: CircularProgressProps = stripSvelteProps(allProps);
    const result = safeParse(CircularProgressPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as CircularProgressProps;
  });
</script>

<div data-slot="circular-progress" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

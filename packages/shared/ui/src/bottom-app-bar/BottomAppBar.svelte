<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * BottomAppBar — Android-style bottom app bar with FAB notch.
   * Placeholder shell awaiting full implementation; ships with a
   * `class` prop for root-level styling overrides.
   *
   * @module
   */

  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const BottomAppBarPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for BottomAppBar. */
  export type BottomAppBarProps = v.InferOutput<typeof BottomAppBarPropsSchema>;
</script>

<script lang="ts">
  /**
   * BottomAppBar — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <BottomAppBar />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = BottomAppBarProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: BottomAppBarProps = $derived.by(() => {
    const rawProps: BottomAppBarProps = stripSvelteProps(allProps);
    const result = safeParse(BottomAppBarPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as BottomAppBarProps;
  });
</script>

<div data-slot="bottom-app-bar" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

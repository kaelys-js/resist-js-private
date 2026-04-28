<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * SafeAreaView Svelte component — wrapper that respects
   * iOS safe-area insets so content avoids notches and home
   * indicators. Placeholder shell awaiting full
   * implementation; ships with a class prop for root-level
   * styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const SafeAreaViewPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for SafeAreaView. */
  export type SafeAreaViewProps = v.InferOutput<typeof SafeAreaViewPropsSchema>;
</script>

<script lang="ts">
  /**
   * SafeAreaView — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <SafeAreaView />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = SafeAreaViewProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: SafeAreaViewProps = $derived.by(() => {
    const rawProps: SafeAreaViewProps = stripSvelteProps(allProps);
    const result = safeParse(SafeAreaViewPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as SafeAreaViewProps;
  });
</script>

<div data-slot="safe-area-view" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

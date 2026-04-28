<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * SpeedDial Svelte component — floating action button (FAB)
   * that expands to reveal a fan of related actions on tap.
   * Placeholder shell awaiting full implementation; ships
   * with a class prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const SpeedDialPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for SpeedDial. */
  export type SpeedDialProps = v.InferOutput<typeof SpeedDialPropsSchema>;
</script>

<script lang="ts">
  /**
   * SpeedDial — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <SpeedDial />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = SpeedDialProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: SpeedDialProps = $derived.by(() => {
    const rawProps: SpeedDialProps = stripSvelteProps(allProps);
    const result = safeParse(SpeedDialPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as SpeedDialProps;
  });
</script>

<div data-slot="speed-dial" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

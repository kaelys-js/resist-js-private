<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * TeachingPopover Svelte component — instructional popover
   * for inline product onboarding (step indicator + dismiss).
   * Placeholder shell awaiting full implementation; ships
   * with a class prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const TeachingPopoverPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for TeachingPopover. */
  export type TeachingPopoverProps = v.InferOutput<typeof TeachingPopoverPropsSchema>;
</script>

<script lang="ts">
  /**
   * TeachingPopover — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <TeachingPopover />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = TeachingPopoverProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: TeachingPopoverProps = $derived.by(() => {
    const rawProps: TeachingPopoverProps = stripSvelteProps(allProps);
    const result = safeParse(TeachingPopoverPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as TeachingPopoverProps;
  });
</script>

<div data-slot="teaching-popover" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

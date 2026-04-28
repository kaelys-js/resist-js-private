<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * Paper Svelte component — Material-style paper / surface
   * container. Placeholder shell awaiting full implementation;
   * ships with a class prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const PaperPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for Paper. */
  export type PaperProps = v.InferOutput<typeof PaperPropsSchema>;
</script>

<script lang="ts">
  /**
   * Paper — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Paper />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = PaperProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: PaperProps = $derived.by(() => {
    const rawProps: PaperProps = stripSvelteProps(allProps);
    const result = safeParse(PaperPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as PaperProps;
  });
</script>

<div data-slot="paper" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

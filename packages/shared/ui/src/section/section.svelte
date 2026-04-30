<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * Section Svelte component — semantic page-section wrapper
   * (`<section>`) for grouping related content blocks.
   * Placeholder shell awaiting full implementation; ships
   * with a class prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const SectionPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for Section. */
  export type SectionProps = v.InferOutput<typeof SectionPropsSchema>;
</script>

<script lang="ts">
  /**
   * Section — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Section />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = SectionProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: SectionProps = $derived.by(() => {
    const rawProps: SectionProps = stripSvelteProps(allProps);
    const result = safeParse(SectionPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as SectionProps;
  });
</script>

<div data-slot="section" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

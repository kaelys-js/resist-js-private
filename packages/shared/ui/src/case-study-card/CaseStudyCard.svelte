<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * CaseStudyCard — portfolio / showcase card for case studies.
   * Placeholder shell awaiting full implementation; ships with a
   * `class` prop for root-level styling overrides.
   *
   * @module
   */

  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const CaseStudyCardPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for CaseStudyCard. */
  export type CaseStudyCardProps = v.InferOutput<typeof CaseStudyCardPropsSchema>;
</script>

<script lang="ts">
  /**
   * CaseStudyCard — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <CaseStudyCard />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = CaseStudyCardProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: CaseStudyCardProps = $derived.by(() => {
    const rawProps: CaseStudyCardProps = stripSvelteProps(allProps);
    const result = safeParse(CaseStudyCardPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as CaseStudyCardProps;
  });
</script>

<div data-slot="case-study-card" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

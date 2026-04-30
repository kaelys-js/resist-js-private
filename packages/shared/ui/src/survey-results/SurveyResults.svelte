<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * SurveyResults Svelte component — visualisation of
   * aggregate survey response distributions per question.
   * Placeholder shell awaiting full implementation; ships
   * with a class prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const SurveyResultsPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for SurveyResults. */
  export type SurveyResultsProps = v.InferOutput<typeof SurveyResultsPropsSchema>;
</script>

<script lang="ts">
  /**
   * SurveyResults — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <SurveyResults />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = SurveyResultsProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: SurveyResultsProps = $derived.by(() => {
    const rawProps: SurveyResultsProps = stripSvelteProps(allProps);
    const result = safeParse(SurveyResultsPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as SurveyResultsProps;
  });
</script>

<div data-slot="survey-results" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

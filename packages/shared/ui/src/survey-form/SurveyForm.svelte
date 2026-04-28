<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * SurveyForm Svelte component — multi-question survey
   * questionnaire surface with progress and submit actions.
   * Placeholder shell awaiting full implementation; ships
   * with a class prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const SurveyFormPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for SurveyForm. */
  export type SurveyFormProps = v.InferOutput<typeof SurveyFormPropsSchema>;
</script>

<script lang="ts">
  /**
   * SurveyForm — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <SurveyForm />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = SurveyFormProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: SurveyFormProps = $derived.by(() => {
    const rawProps: SurveyFormProps = stripSvelteProps(allProps);
    const result = safeParse(SurveyFormPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as SurveyFormProps;
  });
</script>

<div data-slot="survey-form" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

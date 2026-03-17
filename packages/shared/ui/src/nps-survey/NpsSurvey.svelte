<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const NpsSurveyPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type NpsSurveyProps = v.InferOutput<typeof NpsSurveyPropsSchema>;
</script>

<script lang="ts">
  /**
   * NpsSurvey — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <NpsSurvey />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = NpsSurveyProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: NpsSurveyProps = $derived.by(() => {
    const rawProps: NpsSurveyProps = stripSvelteProps(allProps);
    const result = safeParse(NpsSurveyPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as NpsSurveyProps;
  });
</script>

<div data-slot="nps-survey" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

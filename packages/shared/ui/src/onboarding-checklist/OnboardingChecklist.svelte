<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const OnboardingChecklistPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for OnboardingChecklist. */
  export type OnboardingChecklistProps = v.InferOutput<typeof OnboardingChecklistPropsSchema>;
</script>

<script lang="ts">
  /**
   * OnboardingChecklist — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <OnboardingChecklist />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = OnboardingChecklistProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: OnboardingChecklistProps = $derived.by(() => {
    const rawProps: OnboardingChecklistProps = stripSvelteProps(allProps);
    const result = safeParse(OnboardingChecklistPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as OnboardingChecklistProps;
  });
</script>

<div data-slot="onboarding-checklist" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

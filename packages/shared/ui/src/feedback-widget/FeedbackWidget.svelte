<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const FeedbackWidgetPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type FeedbackWidgetProps = v.InferOutput<typeof FeedbackWidgetPropsSchema>;
</script>

<script lang="ts">
  /**
   * FeedbackWidget — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <FeedbackWidget />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = FeedbackWidgetProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: FeedbackWidgetProps = $derived.by(() => {
    const rawProps: FeedbackWidgetProps = stripSvelteProps(allProps);
    const result = safeParse(FeedbackWidgetPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as FeedbackWidgetProps;
  });
</script>

<div data-slot="feedback-widget" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

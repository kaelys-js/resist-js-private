<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const FaqAccordionPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type FaqAccordionProps = v.InferOutput<typeof FaqAccordionPropsSchema>;
</script>

<script lang="ts">
  /**
   * FaqAccordion — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <FaqAccordion />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = FaqAccordionProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: FaqAccordionProps = $derived.by(() => {
    const rawProps: FaqAccordionProps = stripSvelteProps(allProps);
    const result = safeParse(FaqAccordionPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as FaqAccordionProps;
  });
</script>

<div data-slot="faq-accordion" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

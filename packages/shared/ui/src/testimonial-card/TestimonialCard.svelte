<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * TestimonialCard Svelte component — single-quote review
   * card with author, photo, and star rating. Placeholder
   * shell awaiting full implementation; ships with a class
   * prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const TestimonialCardPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for TestimonialCard. */
  export type TestimonialCardProps = v.InferOutput<typeof TestimonialCardPropsSchema>;
</script>

<script lang="ts">
  /**
   * TestimonialCard — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <TestimonialCard />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = TestimonialCardProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: TestimonialCardProps = $derived.by(() => {
    const rawProps: TestimonialCardProps = stripSvelteProps(allProps);
    const result = safeParse(TestimonialCardPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as TestimonialCardProps;
  });
</script>

<div data-slot="testimonial-card" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const TestimonialWallPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for TestimonialWall. */
  export type TestimonialWallProps = v.InferOutput<typeof TestimonialWallPropsSchema>;
</script>

<script lang="ts">
  /**
   * TestimonialWall — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <TestimonialWall />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = TestimonialWallProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: TestimonialWallProps = $derived.by(() => {
    const rawProps: TestimonialWallProps = stripSvelteProps(allProps);
    const result = safeParse(TestimonialWallPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as TestimonialWallProps;
  });
</script>

<div data-slot="testimonial-wall" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

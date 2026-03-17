<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const CourseCardPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type CourseCardProps = v.InferOutput<typeof CourseCardPropsSchema>;
</script>

<script lang="ts">
  /**
   * CourseCard — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <CourseCard />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = CourseCardProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: CourseCardProps = $derived.by(() => {
    const rawProps: CourseCardProps = stripSvelteProps(allProps);
    const result = safeParse(CourseCardPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as CourseCardProps;
  });
</script>

<div data-slot="course-card" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

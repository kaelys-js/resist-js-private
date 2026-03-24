<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const GradeBookPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type GradeBookProps = v.InferOutput<typeof GradeBookPropsSchema>;
</script>

<script lang="ts">
  /**
   * GradeBook — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <GradeBook />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = GradeBookProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: GradeBookProps = $derived.by(() => {
    const rawProps: GradeBookProps = stripSvelteProps(allProps);
    const result = safeParse(GradeBookPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as GradeBookProps;
  });
</script>

<div data-slot="grade-book" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * CurriculumTree — tree view of a course curriculum / module
   * structure. Placeholder shell awaiting full implementation;
   * ships with a `class` prop for root-level styling overrides.
   *
   * @module
   */

  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const CurriculumTreePropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for CurriculumTree. */
  export type CurriculumTreeProps = v.InferOutput<typeof CurriculumTreePropsSchema>;
</script>

<script lang="ts">
  /**
   * CurriculumTree — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <CurriculumTree />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = CurriculumTreeProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: CurriculumTreeProps = $derived.by(() => {
    const rawProps: CurriculumTreeProps = stripSvelteProps(allProps);
    const result = safeParse(CurriculumTreePropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as CurriculumTreeProps;
  });
</script>

<div data-slot="curriculum-tree" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

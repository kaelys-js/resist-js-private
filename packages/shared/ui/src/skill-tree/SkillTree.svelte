<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * SkillTree Svelte component — RPG-style branching skill
   * unlock graph showing prerequisites between abilities.
   * Placeholder shell awaiting full implementation; ships
   * with a class prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const SkillTreePropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for SkillTree. */
  export type SkillTreeProps = v.InferOutput<typeof SkillTreePropsSchema>;
</script>

<script lang="ts">
  /**
   * SkillTree — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <SkillTree />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = SkillTreeProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: SkillTreeProps = $derived.by(() => {
    const rawProps: SkillTreeProps = stripSvelteProps(allProps);
    const result = safeParse(SkillTreePropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as SkillTreeProps;
  });
</script>

<div data-slot="skill-tree" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

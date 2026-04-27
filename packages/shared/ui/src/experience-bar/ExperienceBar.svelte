<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ExperienceBarPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for ExperienceBar. */
  export type ExperienceBarProps = v.InferOutput<typeof ExperienceBarPropsSchema>;
</script>

<script lang="ts">
  /**
   * ExperienceBar — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ExperienceBar />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ExperienceBarProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ExperienceBarProps = $derived.by(() => {
    const rawProps: ExperienceBarProps = stripSvelteProps(allProps);
    const result = safeParse(ExperienceBarPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ExperienceBarProps;
  });
</script>

<div data-slot="experience-bar" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

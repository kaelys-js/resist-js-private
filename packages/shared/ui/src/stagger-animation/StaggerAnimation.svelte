<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * StaggerAnimation Svelte component — entrance-animation
   * wrapper that animates children in sequence with a
   * configurable delay between each. Placeholder shell
   * awaiting full implementation; ships with a class prop
   * for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const StaggerAnimationPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for StaggerAnimation. */
  export type StaggerAnimationProps = v.InferOutput<typeof StaggerAnimationPropsSchema>;
</script>

<script lang="ts">
  /**
   * StaggerAnimation — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <StaggerAnimation />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = StaggerAnimationProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: StaggerAnimationProps = $derived.by(() => {
    const rawProps: StaggerAnimationProps = stripSvelteProps(allProps);
    const result = safeParse(StaggerAnimationPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as StaggerAnimationProps;
  });
</script>

<div data-slot="stagger-animation" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

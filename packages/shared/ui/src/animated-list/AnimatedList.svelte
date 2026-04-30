<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * AnimatedList — list whose items animate in sequentially with
   * staggered entrance effects. Placeholder shell awaiting full
   * implementation; ships with a `class` prop for root-level
   * styling overrides.
   *
   * @module
   */

  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const AnimatedListPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for AnimatedList. */
  export type AnimatedListProps = v.InferOutput<typeof AnimatedListPropsSchema>;
</script>

<script lang="ts">
  /**
   * AnimatedList — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <AnimatedList />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = AnimatedListProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: AnimatedListProps = $derived.by(() => {
    const rawProps: AnimatedListProps = stripSvelteProps(allProps);
    const result = safeParse(AnimatedListPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as AnimatedListProps;
  });
</script>

<div data-slot="animated-list" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

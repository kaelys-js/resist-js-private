<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * ComingSoon — placeholder marketing splash for upcoming
   * features. Placeholder shell awaiting full implementation;
   * ships with a `class` prop for root-level styling overrides.
   *
   * @module
   */

  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ComingSoonPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for ComingSoon. */
  export type ComingSoonProps = v.InferOutput<typeof ComingSoonPropsSchema>;
</script>

<script lang="ts">
  /**
   * ComingSoon — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ComingSoon />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ComingSoonProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ComingSoonProps = $derived.by(() => {
    const rawProps: ComingSoonProps = stripSvelteProps(allProps);
    const result = safeParse(ComingSoonPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ComingSoonProps;
  });
</script>

<div data-slot="coming-soon" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

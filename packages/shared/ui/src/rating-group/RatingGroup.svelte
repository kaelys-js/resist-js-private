<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const RatingGroupPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type RatingGroupProps = v.InferOutput<typeof RatingGroupPropsSchema>;
</script>

<script lang="ts">
  /**
   * RatingGroup — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <RatingGroup />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = RatingGroupProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: RatingGroupProps = $derived.by(() => {
    const rawProps: RatingGroupProps = stripSvelteProps(allProps);
    const result = safeParse(RatingGroupPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as RatingGroupProps;
  });
</script>

<div data-slot="rating-group" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

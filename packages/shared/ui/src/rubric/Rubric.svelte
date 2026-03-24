<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const RubricPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type RubricProps = v.InferOutput<typeof RubricPropsSchema>;
</script>

<script lang="ts">
  /**
   * Rubric — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Rubric />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = RubricProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: RubricProps = $derived.by(() => {
    const rawProps: RubricProps = stripSvelteProps(allProps);
    const result = safeParse(RubricPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as RubricProps;
  });
</script>

<div data-slot="rubric" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

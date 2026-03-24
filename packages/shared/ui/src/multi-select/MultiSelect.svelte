<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const MultiSelectPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type MultiSelectProps = v.InferOutput<typeof MultiSelectPropsSchema>;
</script>

<script lang="ts">
  /**
   * MultiSelect — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <MultiSelect />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = MultiSelectProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: MultiSelectProps = $derived.by(() => {
    const rawProps: MultiSelectProps = stripSvelteProps(allProps);
    const result = safeParse(MultiSelectPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as MultiSelectProps;
  });
</script>

<div data-slot="multi-select" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

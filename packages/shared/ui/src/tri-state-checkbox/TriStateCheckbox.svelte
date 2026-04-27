<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const TriStateCheckboxPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for TriStateCheckbox. */
  export type TriStateCheckboxProps = v.InferOutput<typeof TriStateCheckboxPropsSchema>;
</script>

<script lang="ts">
  /**
   * TriStateCheckbox — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <TriStateCheckbox />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = TriStateCheckboxProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: TriStateCheckboxProps = $derived.by(() => {
    const rawProps: TriStateCheckboxProps = stripSvelteProps(allProps);
    const result = safeParse(TriStateCheckboxPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as TriStateCheckboxProps;
  });
</script>

<div data-slot="tri-state-checkbox" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

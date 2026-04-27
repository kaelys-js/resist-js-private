<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * CheckboxGroup — grouped multi-select checkboxes wired as a
   * single form control. Placeholder shell awaiting full
   * implementation; ships with a `class` prop for root-level
   * styling overrides.
   *
   * @module
   */

  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const CheckboxGroupPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for CheckboxGroup. */
  export type CheckboxGroupProps = v.InferOutput<typeof CheckboxGroupPropsSchema>;
</script>

<script lang="ts">
  /**
   * CheckboxGroup — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <CheckboxGroup />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = CheckboxGroupProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: CheckboxGroupProps = $derived.by(() => {
    const rawProps: CheckboxGroupProps = stripSvelteProps(allProps);
    const result = safeParse(CheckboxGroupPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as CheckboxGroupProps;
  });
</script>

<div data-slot="checkbox-group" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * Autocomplete — text input with a dropdown of filtered
   * suggestions that update as the user types. Placeholder shell
   * awaiting full implementation; ships with a `class` prop for
   * root-level styling overrides.
   *
   * @module
   */

  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const AutocompletePropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for Autocomplete. */
  export type AutocompleteProps = v.InferOutput<typeof AutocompletePropsSchema>;
</script>

<script lang="ts">
  /**
   * Autocomplete — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Autocomplete />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = AutocompleteProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: AutocompleteProps = $derived.by(() => {
    const rawProps: AutocompleteProps = stripSvelteProps(allProps);
    const result = safeParse(AutocompletePropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as AutocompleteProps;
  });
</script>

<div data-slot="autocomplete" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const AddressAutocompletePropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for AddressAutocomplete. */
  export type AddressAutocompleteProps = v.InferOutput<typeof AddressAutocompletePropsSchema>;
</script>

<script lang="ts">
  /**
   * AddressAutocomplete — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <AddressAutocomplete />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = AddressAutocompleteProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: AddressAutocompleteProps = $derived.by(() => {
    const rawProps: AddressAutocompleteProps = stripSvelteProps(allProps);
    const result = safeParse(AddressAutocompletePropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as AddressAutocompleteProps;
  });
</script>

<div data-slot="address-autocomplete" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * LocationPicker Svelte component — map-based location
   * selector for choosing coordinates. Placeholder shell
   * awaiting full implementation; ships with a class prop for
   * root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const LocationPickerPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for LocationPicker. */
  export type LocationPickerProps = v.InferOutput<typeof LocationPickerPropsSchema>;
</script>

<script lang="ts">
  /**
   * LocationPicker — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <LocationPicker />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = LocationPickerProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: LocationPickerProps = $derived.by(() => {
    const rawProps: LocationPickerProps = stripSvelteProps(allProps);
    const result = safeParse(LocationPickerPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as LocationPickerProps;
  });
</script>

<div data-slot="location-picker" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ColorBlindFilterPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for ColorBlindFilter. */
  export type ColorBlindFilterProps = v.InferOutput<typeof ColorBlindFilterPropsSchema>;
</script>

<script lang="ts">
  /**
   * ColorBlindFilter — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ColorBlindFilter />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ColorBlindFilterProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ColorBlindFilterProps = $derived.by(() => {
    const rawProps: ColorBlindFilterProps = stripSvelteProps(allProps);
    const result = safeParse(ColorBlindFilterPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ColorBlindFilterProps;
  });
</script>

<div data-slot="color-blind-filter" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

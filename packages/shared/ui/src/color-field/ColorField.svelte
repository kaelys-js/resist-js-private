<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ColorFieldPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for ColorField. */
  export type ColorFieldProps = v.InferOutput<typeof ColorFieldPropsSchema>;
</script>

<script lang="ts">
  /**
   * ColorField — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ColorField />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ColorFieldProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ColorFieldProps = $derived.by(() => {
    const rawProps: ColorFieldProps = stripSvelteProps(allProps);
    const result = safeParse(ColorFieldPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ColorFieldProps;
  });
</script>

<div data-slot="color-field" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

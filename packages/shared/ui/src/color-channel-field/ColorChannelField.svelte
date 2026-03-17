<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ColorChannelFieldPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type ColorChannelFieldProps = v.InferOutput<typeof ColorChannelFieldPropsSchema>;
</script>

<script lang="ts">
  /**
   * ColorChannelField — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ColorChannelField />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ColorChannelFieldProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ColorChannelFieldProps = $derived.by(() => {
    const rawProps: ColorChannelFieldProps = stripSvelteProps(allProps);
    const result = safeParse(ColorChannelFieldPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ColorChannelFieldProps;
  });
</script>

<div data-slot="color-channel-field" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

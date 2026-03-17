<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const FormatNumberPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type FormatNumberProps = v.InferOutput<typeof FormatNumberPropsSchema>;
</script>

<script lang="ts">
  /**
   * FormatNumber — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <FormatNumber />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = FormatNumberProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: FormatNumberProps = $derived.by(() => {
    const rawProps: FormatNumberProps = stripSvelteProps(allProps);
    const result = safeParse(FormatNumberPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as FormatNumberProps;
  });
</script>

<div data-slot="format-number" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

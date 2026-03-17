<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ItemTooltipPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type ItemTooltipProps = v.InferOutput<typeof ItemTooltipPropsSchema>;
</script>

<script lang="ts">
  /**
   * ItemTooltip — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ItemTooltip />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ItemTooltipProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ItemTooltipProps = $derived.by(() => {
    const rawProps: ItemTooltipProps = stripSvelteProps(allProps);
    const result = safeParse(ItemTooltipPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ItemTooltipProps;
  });
</script>

<div data-slot="item-tooltip" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

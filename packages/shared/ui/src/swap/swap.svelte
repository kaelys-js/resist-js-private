<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const SwapPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type SwapProps = v.InferOutput<typeof SwapPropsSchema>;
</script>

<script lang="ts">
  /**
   * Swap — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Swap />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = SwapProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: SwapProps = $derived.by(() => {
    const rawProps: SwapProps = stripSvelteProps(allProps);
    const result = safeParse(SwapPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as SwapProps;
  });
</script>

<div data-slot="swap" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

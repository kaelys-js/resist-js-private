<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ShimmerButtonPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type ShimmerButtonProps = v.InferOutput<typeof ShimmerButtonPropsSchema>;
</script>

<script lang="ts">
  /**
   * ShimmerButton — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ShimmerButton />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ShimmerButtonProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ShimmerButtonProps = $derived.by(() => {
    const rawProps: ShimmerButtonProps = stripSvelteProps(allProps);
    const result = safeParse(ShimmerButtonPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ShimmerButtonProps;
  });
</script>

<div data-slot="shimmer-button" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

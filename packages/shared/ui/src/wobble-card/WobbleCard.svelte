<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const WobbleCardPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for WobbleCard. */
  export type WobbleCardProps = v.InferOutput<typeof WobbleCardPropsSchema>;
</script>

<script lang="ts">
  /**
   * WobbleCard — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <WobbleCard />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = WobbleCardProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: WobbleCardProps = $derived.by(() => {
    const rawProps: WobbleCardProps = stripSvelteProps(allProps);
    const result = safeParse(WobbleCardPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as WobbleCardProps;
  });
</script>

<div data-slot="wobble-card" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

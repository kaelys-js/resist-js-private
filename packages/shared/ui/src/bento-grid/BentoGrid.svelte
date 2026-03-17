<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const BentoGridPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type BentoGridProps = v.InferOutput<typeof BentoGridPropsSchema>;
</script>

<script lang="ts">
  /**
   * BentoGrid — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <BentoGrid />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = BentoGridProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: BentoGridProps = $derived.by(() => {
    const rawProps: BentoGridProps = stripSvelteProps(allProps);
    const result = safeParse(BentoGridPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as BentoGridProps;
  });
</script>

<div data-slot="bento-grid" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

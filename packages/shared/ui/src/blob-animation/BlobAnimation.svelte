<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * BlobAnimation — animated SVG blob shape that morphs between
   * paths. Placeholder shell awaiting full implementation; ships
   * with a `class` prop for root-level styling overrides.
   *
   * @module
   */

  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const BlobAnimationPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for BlobAnimation. */
  export type BlobAnimationProps = v.InferOutput<typeof BlobAnimationPropsSchema>;
</script>

<script lang="ts">
  /**
   * BlobAnimation — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <BlobAnimation />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = BlobAnimationProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: BlobAnimationProps = $derived.by(() => {
    const rawProps: BlobAnimationProps = stripSvelteProps(allProps);
    const result = safeParse(BlobAnimationPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as BlobAnimationProps;
  });
</script>

<div data-slot="blob-animation" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

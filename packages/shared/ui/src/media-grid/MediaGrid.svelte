<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const MediaGridPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for MediaGrid. */
  export type MediaGridProps = v.InferOutput<typeof MediaGridPropsSchema>;
</script>

<script lang="ts">
  /**
   * MediaGrid — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <MediaGrid />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = MediaGridProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: MediaGridProps = $derived.by(() => {
    const rawProps: MediaGridProps = stripSvelteProps(allProps);
    const result = safeParse(MediaGridPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as MediaGridProps;
  });
</script>

<div data-slot="media-grid" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

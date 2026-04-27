<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ShareCountPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for ShareCount. */
  export type ShareCountProps = v.InferOutput<typeof ShareCountPropsSchema>;
</script>

<script lang="ts">
  /**
   * ShareCount — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ShareCount />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ShareCountProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ShareCountProps = $derived.by(() => {
    const rawProps: ShareCountProps = stripSvelteProps(allProps);
    const result = safeParse(ShareCountPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ShareCountProps;
  });
</script>

<div data-slot="share-count" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

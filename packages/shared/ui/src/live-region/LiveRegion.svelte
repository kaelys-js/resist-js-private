<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const LiveRegionPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type LiveRegionProps = v.InferOutput<typeof LiveRegionPropsSchema>;
</script>

<script lang="ts">
  /**
   * LiveRegion — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <LiveRegion />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = LiveRegionProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: LiveRegionProps = $derived.by(() => {
    const rawProps: LiveRegionProps = stripSvelteProps(allProps);
    const result = safeParse(LiveRegionPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as LiveRegionProps;
  });
</script>

<div data-slot="live-region" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

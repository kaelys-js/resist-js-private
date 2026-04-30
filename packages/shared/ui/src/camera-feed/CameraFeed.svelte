<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * CameraFeed — live camera feed player for streaming video
   * sources. Placeholder shell awaiting full implementation;
   * ships with a `class` prop for root-level styling overrides.
   *
   * @module
   */

  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const CameraFeedPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for CameraFeed. */
  export type CameraFeedProps = v.InferOutput<typeof CameraFeedPropsSchema>;
</script>

<script lang="ts">
  /**
   * CameraFeed — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <CameraFeed />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = CameraFeedProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: CameraFeedProps = $derived.by(() => {
    const rawProps: CameraFeedProps = stripSvelteProps(allProps);
    const result = safeParse(CameraFeedPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as CameraFeedProps;
  });
</script>

<div data-slot="camera-feed" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

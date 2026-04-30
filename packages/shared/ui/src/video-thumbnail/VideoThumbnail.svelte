<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * VideoThumbnail Svelte component — preview image with a
   * play-icon overlay used as a clickable video thumbnail.
   * Placeholder shell awaiting full implementation; ships
   * with a class prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const VideoThumbnailPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for VideoThumbnail. */
  export type VideoThumbnailProps = v.InferOutput<typeof VideoThumbnailPropsSchema>;
</script>

<script lang="ts">
  /**
   * VideoThumbnail — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <VideoThumbnail />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = VideoThumbnailProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: VideoThumbnailProps = $derived.by(() => {
    const rawProps: VideoThumbnailProps = stripSvelteProps(allProps);
    const result = safeParse(VideoThumbnailPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as VideoThumbnailProps;
  });
</script>

<div data-slot="video-thumbnail" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

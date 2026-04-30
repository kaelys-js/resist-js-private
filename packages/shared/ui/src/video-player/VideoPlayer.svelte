<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * VideoPlayer Svelte component — HTML5 `<video>` wrapper
   * with custom playback controls. Placeholder shell
   * awaiting full implementation; ships with a class prop
   * for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const VideoPlayerPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for VideoPlayer. */
  export type VideoPlayerProps = v.InferOutput<typeof VideoPlayerPropsSchema>;
</script>

<script lang="ts">
  /**
   * VideoPlayer — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <VideoPlayer />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = VideoPlayerProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: VideoPlayerProps = $derived.by(() => {
    const rawProps: VideoPlayerProps = stripSvelteProps(allProps);
    const result = safeParse(VideoPlayerPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as VideoPlayerProps;
  });
</script>

<div data-slot="video-player" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

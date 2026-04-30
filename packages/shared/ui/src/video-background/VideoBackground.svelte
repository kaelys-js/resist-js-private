<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * VideoBackground Svelte component — fullscreen looping
   * ambient video used as a hero background. Placeholder
   * shell awaiting full implementation; ships with a class
   * prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const VideoBackgroundPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for VideoBackground. */
  export type VideoBackgroundProps = v.InferOutput<typeof VideoBackgroundPropsSchema>;
</script>

<script lang="ts">
  /**
   * VideoBackground — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <VideoBackground />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = VideoBackgroundProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: VideoBackgroundProps = $derived.by(() => {
    const rawProps: VideoBackgroundProps = stripSvelteProps(allProps);
    const result = safeParse(VideoBackgroundPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as VideoBackgroundProps;
  });
</script>

<div data-slot="video-background" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

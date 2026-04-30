<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * VideoEmbed Svelte component — responsive iframe wrapper
   * for embedded YouTube / Vimeo / Loom players. Placeholder
   * shell awaiting full implementation; ships with a class
   * prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const VideoEmbedPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for VideoEmbed. */
  export type VideoEmbedProps = v.InferOutput<typeof VideoEmbedPropsSchema>;
</script>

<script lang="ts">
  /**
   * VideoEmbed — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <VideoEmbed />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = VideoEmbedProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: VideoEmbedProps = $derived.by(() => {
    const rawProps: VideoEmbedProps = stripSvelteProps(allProps);
    const result = safeParse(VideoEmbedPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as VideoEmbedProps;
  });
</script>

<div data-slot="video-embed" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

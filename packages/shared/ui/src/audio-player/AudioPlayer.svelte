<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * AudioPlayer — audio playback surface with transport
   * controls. Placeholder shell awaiting full implementation;
   * ships with a `class` prop for root-level styling overrides.
   *
   * @module
   */

  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const AudioPlayerPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for AudioPlayer. */
  export type AudioPlayerProps = v.InferOutput<typeof AudioPlayerPropsSchema>;
</script>

<script lang="ts">
  /**
   * AudioPlayer — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <AudioPlayer />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = AudioPlayerProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: AudioPlayerProps = $derived.by(() => {
    const rawProps: AudioPlayerProps = stripSvelteProps(allProps);
    const result = safeParse(AudioPlayerPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as AudioPlayerProps;
  });
</script>

<div data-slot="audio-player" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

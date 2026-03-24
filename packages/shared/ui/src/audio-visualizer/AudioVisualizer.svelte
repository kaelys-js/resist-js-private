<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const AudioVisualizerPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type AudioVisualizerProps = v.InferOutput<typeof AudioVisualizerPropsSchema>;
</script>

<script lang="ts">
  /**
   * AudioVisualizer — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <AudioVisualizer />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = AudioVisualizerProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: AudioVisualizerProps = $derived.by(() => {
    const rawProps: AudioVisualizerProps = stripSvelteProps(allProps);
    const result = safeParse(AudioVisualizerPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as AudioVisualizerProps;
  });
</script>

<div data-slot="audio-visualizer" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

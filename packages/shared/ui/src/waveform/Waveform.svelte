<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const WaveformPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for Waveform. */
  export type WaveformProps = v.InferOutput<typeof WaveformPropsSchema>;
</script>

<script lang="ts">
  /**
   * Waveform — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Waveform />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = WaveformProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: WaveformProps = $derived.by(() => {
    const rawProps: WaveformProps = stripSvelteProps(allProps);
    const result = safeParse(WaveformPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as WaveformProps;
  });
</script>

<div data-slot="waveform" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

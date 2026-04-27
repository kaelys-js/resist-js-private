<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const WavyBackgroundPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for WavyBackground. */
  export type WavyBackgroundProps = v.InferOutput<typeof WavyBackgroundPropsSchema>;
</script>

<script lang="ts">
  /**
   * WavyBackground — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <WavyBackground />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = WavyBackgroundProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: WavyBackgroundProps = $derived.by(() => {
    const rawProps: WavyBackgroundProps = stripSvelteProps(allProps);
    const result = safeParse(WavyBackgroundPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as WavyBackgroundProps;
  });
</script>

<div data-slot="wavy-background" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

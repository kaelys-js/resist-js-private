<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const NoiseBackgroundPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for NoiseBackground. */
  export type NoiseBackgroundProps = v.InferOutput<typeof NoiseBackgroundPropsSchema>;
</script>

<script lang="ts">
  /**
   * NoiseBackground — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <NoiseBackground />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = NoiseBackgroundProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: NoiseBackgroundProps = $derived.by(() => {
    const rawProps: NoiseBackgroundProps = stripSvelteProps(allProps);
    const result = safeParse(NoiseBackgroundPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as NoiseBackgroundProps;
  });
</script>

<div data-slot="noise-background" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

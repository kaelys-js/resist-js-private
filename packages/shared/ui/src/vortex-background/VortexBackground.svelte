<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * VortexBackground Svelte component — animated swirling
   * particle vortex used as a hero / decorative background.
   * Placeholder shell awaiting full implementation; ships
   * with a class prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const VortexBackgroundPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for VortexBackground. */
  export type VortexBackgroundProps = v.InferOutput<typeof VortexBackgroundPropsSchema>;
</script>

<script lang="ts">
  /**
   * VortexBackground — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <VortexBackground />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = VortexBackgroundProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: VortexBackgroundProps = $derived.by(() => {
    const rawProps: VortexBackgroundProps = stripSvelteProps(allProps);
    const result = safeParse(VortexBackgroundPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as VortexBackgroundProps;
  });
</script>

<div data-slot="vortex-background" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

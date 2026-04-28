<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * GlowEffect Svelte component — ambient hover glow effect
   * wrapped around an arbitrary element. Placeholder shell
   * awaiting full implementation; ships with a class prop for
   * root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const GlowEffectPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for GlowEffect. */
  export type GlowEffectProps = v.InferOutput<typeof GlowEffectPropsSchema>;
</script>

<script lang="ts">
  /**
   * GlowEffect — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <GlowEffect />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = GlowEffectProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: GlowEffectProps = $derived.by(() => {
    const rawProps: GlowEffectProps = stripSvelteProps(allProps);
    const result = safeParse(GlowEffectPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as GlowEffectProps;
  });
</script>

<div data-slot="glow-effect" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

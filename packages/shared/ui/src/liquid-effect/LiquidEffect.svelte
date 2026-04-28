<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * LiquidEffect Svelte component — animated liquid /
   * fluid morph effect on a target element. Placeholder shell
   * awaiting full implementation; ships with a class prop for
   * root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const LiquidEffectPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for LiquidEffect. */
  export type LiquidEffectProps = v.InferOutput<typeof LiquidEffectPropsSchema>;
</script>

<script lang="ts">
  /**
   * LiquidEffect — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <LiquidEffect />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = LiquidEffectProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: LiquidEffectProps = $derived.by(() => {
    const rawProps: LiquidEffectProps = stripSvelteProps(allProps);
    const result = safeParse(LiquidEffectPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as LiquidEffectProps;
  });
</script>

<div data-slot="liquid-effect" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

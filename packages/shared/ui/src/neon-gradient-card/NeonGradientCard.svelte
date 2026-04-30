<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * NeonGradientCard Svelte component — card with animated
   * neon gradient outline effect. Placeholder shell awaiting
   * full implementation; ships with a class prop for root-level
   * styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const NeonGradientCardPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for NeonGradientCard. */
  export type NeonGradientCardProps = v.InferOutput<typeof NeonGradientCardPropsSchema>;
</script>

<script lang="ts">
  /**
   * NeonGradientCard — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <NeonGradientCard />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = NeonGradientCardProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: NeonGradientCardProps = $derived.by(() => {
    const rawProps: NeonGradientCardProps = stripSvelteProps(allProps);
    const result = safeParse(NeonGradientCardPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as NeonGradientCardProps;
  });
</script>

<div data-slot="neon-gradient-card" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

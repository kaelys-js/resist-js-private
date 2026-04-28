<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * GlassCard Svelte component — frosted-glass / glassmorphism
   * card surface with backdrop blur. Placeholder shell awaiting
   * full implementation; ships with a class prop for root-level
   * styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const GlassCardPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for GlassCard. */
  export type GlassCardProps = v.InferOutput<typeof GlassCardPropsSchema>;
</script>

<script lang="ts">
  /**
   * GlassCard — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <GlassCard />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = GlassCardProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: GlassCardProps = $derived.by(() => {
    const rawProps: GlassCardProps = stripSvelteProps(allProps);
    const result = safeParse(GlassCardPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as GlassCardProps;
  });
</script>

<div data-slot="glass-card" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

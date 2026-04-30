<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * GlareCard Svelte component — interactive card with a
   * mouse-tracking shine / glare highlight and subtle tilt.
   * Placeholder shell awaiting full implementation; ships with a
   * class prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const GlareCardPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for GlareCard. */
  export type GlareCardProps = v.InferOutput<typeof GlareCardPropsSchema>;
</script>

<script lang="ts">
  /**
   * GlareCard — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <GlareCard />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = GlareCardProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: GlareCardProps = $derived.by(() => {
    const rawProps: GlareCardProps = stripSvelteProps(allProps);
    const result = safeParse(GlareCardPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as GlareCardProps;
  });
</script>

<div data-slot="glare-card" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

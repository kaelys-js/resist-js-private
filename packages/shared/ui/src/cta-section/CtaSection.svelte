<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * CtaSection — full-section call-to-action with heading,
   * description, and primary action button. Placeholder shell
   * awaiting full implementation; ships with a `class` prop for
   * root-level styling overrides.
   *
   * @module
   */

  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const CtaSectionPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for CtaSection. */
  export type CtaSectionProps = v.InferOutput<typeof CtaSectionPropsSchema>;
</script>

<script lang="ts">
  /**
   * CtaSection — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <CtaSection />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = CtaSectionProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: CtaSectionProps = $derived.by(() => {
    const rawProps: CtaSectionProps = stripSvelteProps(allProps);
    const result = safeParse(CtaSectionPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as CtaSectionProps;
  });
</script>

<div data-slot="cta-section" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

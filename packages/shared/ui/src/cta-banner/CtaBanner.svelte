<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * CtaBanner — call-to-action marketing banner. Placeholder
   * shell awaiting full implementation; ships with a `class`
   * prop for root-level styling overrides.
   *
   * @module
   */

  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const CtaBannerPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for CtaBanner. */
  export type CtaBannerProps = v.InferOutput<typeof CtaBannerPropsSchema>;
</script>

<script lang="ts">
  /**
   * CtaBanner — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <CtaBanner />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = CtaBannerProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: CtaBannerProps = $derived.by(() => {
    const rawProps: CtaBannerProps = stripSvelteProps(allProps);
    const result = safeParse(CtaBannerPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as CtaBannerProps;
  });
</script>

<div data-slot="cta-banner" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

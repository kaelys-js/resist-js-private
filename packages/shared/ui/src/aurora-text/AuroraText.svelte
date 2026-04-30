<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * AuroraText — text rendered with a shimmering aurora-style
   * gradient fill. Placeholder shell awaiting full
   * implementation; ships with a `class` prop for root-level
   * styling overrides.
   *
   * @module
   */

  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const AuroraTextPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for AuroraText. */
  export type AuroraTextProps = v.InferOutput<typeof AuroraTextPropsSchema>;
</script>

<script lang="ts">
  /**
   * AuroraText — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <AuroraText />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = AuroraTextProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: AuroraTextProps = $derived.by(() => {
    const rawProps: AuroraTextProps = stripSvelteProps(allProps);
    const result = safeParse(AuroraTextPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as AuroraTextProps;
  });
</script>

<div data-slot="aurora-text" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

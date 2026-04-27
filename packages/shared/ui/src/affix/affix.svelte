<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * Affix — wrapper that fixes its child to the viewport once the
   * user scrolls past a configured threshold. Placeholder shell
   * awaiting full implementation; ships with a `class` prop for
   * root-level styling overrides.
   *
   * @module
   */

  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const AffixPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for Affix. */
  export type AffixProps = v.InferOutput<typeof AffixPropsSchema>;
</script>

<script lang="ts">
  /**
   * Affix — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Affix />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = AffixProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: AffixProps = $derived.by(() => {
    const rawProps: AffixProps = stripSvelteProps(allProps);
    const result = safeParse(AffixPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as AffixProps;
  });
</script>

<div data-slot="affix" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

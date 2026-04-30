<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * Descriptions — Ant Design-style descriptions panel for
   * displaying labelled values. Placeholder shell awaiting full
   * implementation; ships with a `class` prop for root-level
   * styling overrides.
   *
   * @module
   */

  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const DescriptionsPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for Descriptions. */
  export type DescriptionsProps = v.InferOutput<typeof DescriptionsPropsSchema>;
</script>

<script lang="ts">
  /**
   * Descriptions — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Descriptions />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = DescriptionsProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: DescriptionsProps = $derived.by(() => {
    const rawProps: DescriptionsProps = stripSvelteProps(allProps);
    const result = safeParse(DescriptionsPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as DescriptionsProps;
  });
</script>

<div data-slot="descriptions" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

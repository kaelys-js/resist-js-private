<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const FeatureGridPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for FeatureGrid. */
  export type FeatureGridProps = v.InferOutput<typeof FeatureGridPropsSchema>;
</script>

<script lang="ts">
  /**
   * FeatureGrid — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <FeatureGrid />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = FeatureGridProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: FeatureGridProps = $derived.by(() => {
    const rawProps: FeatureGridProps = stripSvelteProps(allProps);
    const result = safeParse(FeatureGridPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as FeatureGridProps;
  });
</script>

<div data-slot="feature-grid" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

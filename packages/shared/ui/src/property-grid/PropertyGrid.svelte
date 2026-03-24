<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const PropertyGridPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type PropertyGridProps = v.InferOutput<typeof PropertyGridPropsSchema>;
</script>

<script lang="ts">
  /**
   * PropertyGrid — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <PropertyGrid />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = PropertyGridProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: PropertyGridProps = $derived.by(() => {
    const rawProps: PropertyGridProps = stripSvelteProps(allProps);
    const result = safeParse(PropertyGridPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as PropertyGridProps;
  });
</script>

<div data-slot="property-grid" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

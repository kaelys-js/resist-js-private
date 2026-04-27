<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const FlickeringGridPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for FlickeringGrid. */
  export type FlickeringGridProps = v.InferOutput<typeof FlickeringGridPropsSchema>;
</script>

<script lang="ts">
  /**
   * FlickeringGrid — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <FlickeringGrid />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = FlickeringGridProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: FlickeringGridProps = $derived.by(() => {
    const rawProps: FlickeringGridProps = stripSvelteProps(allProps);
    const result = safeParse(FlickeringGridPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as FlickeringGridProps;
  });
</script>

<div data-slot="flickering-grid" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

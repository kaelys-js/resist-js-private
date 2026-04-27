<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const SimpleGridPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for SimpleGrid. */
  export type SimpleGridProps = v.InferOutput<typeof SimpleGridPropsSchema>;
</script>

<script lang="ts">
  /**
   * SimpleGrid — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <SimpleGrid />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = SimpleGridProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: SimpleGridProps = $derived.by(() => {
    const rawProps: SimpleGridProps = stripSvelteProps(allProps);
    const result = safeParse(SimpleGridPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as SimpleGridProps;
  });
</script>

<div data-slot="simple-grid" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

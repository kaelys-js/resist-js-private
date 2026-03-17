<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const CategoryBarPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type CategoryBarProps = v.InferOutput<typeof CategoryBarPropsSchema>;
</script>

<script lang="ts">
  /**
   * CategoryBar — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <CategoryBar />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = CategoryBarProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: CategoryBarProps = $derived.by(() => {
    const rawProps: CategoryBarProps = stripSvelteProps(allProps);
    const result = safeParse(CategoryBarPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as CategoryBarProps;
  });
</script>

<div data-slot="category-bar" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

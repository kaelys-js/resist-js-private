<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const VisuallyHiddenPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type VisuallyHiddenProps = v.InferOutput<typeof VisuallyHiddenPropsSchema>;
</script>

<script lang="ts">
  /**
   * VisuallyHidden — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <VisuallyHidden />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = VisuallyHiddenProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: VisuallyHiddenProps = $derived.by(() => {
    const rawProps: VisuallyHiddenProps = stripSvelteProps(allProps);
    const result = safeParse(VisuallyHiddenPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as VisuallyHiddenProps;
  });
</script>

<div data-slot="visually-hidden" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

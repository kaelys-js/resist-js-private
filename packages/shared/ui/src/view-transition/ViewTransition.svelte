<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ViewTransitionPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for ViewTransition. */
  export type ViewTransitionProps = v.InferOutput<typeof ViewTransitionPropsSchema>;
</script>

<script lang="ts">
  /**
   * ViewTransition — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ViewTransition />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ViewTransitionProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ViewTransitionProps = $derived.by(() => {
    const rawProps: ViewTransitionProps = stripSvelteProps(allProps);
    const result = safeParse(ViewTransitionPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ViewTransitionProps;
  });
</script>

<div data-slot="view-transition" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ResizeObserverPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type ResizeObserverProps = v.InferOutput<typeof ResizeObserverPropsSchema>;
</script>

<script lang="ts">
  /**
   * ResizeObserver — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ResizeObserver />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ResizeObserverProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ResizeObserverProps = $derived.by(() => {
    const rawProps: ResizeObserverProps = stripSvelteProps(allProps);
    const result = safeParse(ResizeObserverPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ResizeObserverProps;
  });
</script>

<div data-slot="resize-observer" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

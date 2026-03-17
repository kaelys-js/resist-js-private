<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const AnnotationLayerPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type AnnotationLayerProps = v.InferOutput<typeof AnnotationLayerPropsSchema>;
</script>

<script lang="ts">
  /**
   * AnnotationLayer — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <AnnotationLayer />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = AnnotationLayerProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: AnnotationLayerProps = $derived.by(() => {
    const rawProps: AnnotationLayerProps = stripSvelteProps(allProps);
    const result = safeParse(AnnotationLayerPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as AnnotationLayerProps;
  });
</script>

<div data-slot="annotation-layer" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

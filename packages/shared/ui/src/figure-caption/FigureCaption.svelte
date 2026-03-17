<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const FigureCaptionPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type FigureCaptionProps = v.InferOutput<typeof FigureCaptionPropsSchema>;
</script>

<script lang="ts">
  /**
   * FigureCaption — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <FigureCaption />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = FigureCaptionProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: FigureCaptionProps = $derived.by(() => {
    const rawProps: FigureCaptionProps = stripSvelteProps(allProps);
    const result = safeParse(FigureCaptionPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as FigureCaptionProps;
  });
</script>

<div data-slot="figure-caption" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

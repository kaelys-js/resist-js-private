<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const GradientTextPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type GradientTextProps = v.InferOutput<typeof GradientTextPropsSchema>;
</script>

<script lang="ts">
  /**
   * GradientText — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <GradientText />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = GradientTextProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: GradientTextProps = $derived.by(() => {
    const rawProps: GradientTextProps = stripSvelteProps(allProps);
    const result = safeParse(GradientTextPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as GradientTextProps;
  });
</script>

<div data-slot="gradient-text" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

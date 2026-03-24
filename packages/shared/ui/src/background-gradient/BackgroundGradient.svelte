<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const BackgroundGradientPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type BackgroundGradientProps = v.InferOutput<typeof BackgroundGradientPropsSchema>;
</script>

<script lang="ts">
  /**
   * BackgroundGradient — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <BackgroundGradient />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = BackgroundGradientProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: BackgroundGradientProps = $derived.by(() => {
    const rawProps: BackgroundGradientProps = stripSvelteProps(allProps);
    const result = safeParse(BackgroundGradientPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as BackgroundGradientProps;
  });
</script>

<div data-slot="background-gradient" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const MatrixRainPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type MatrixRainProps = v.InferOutput<typeof MatrixRainPropsSchema>;
</script>

<script lang="ts">
  /**
   * MatrixRain — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <MatrixRain />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = MatrixRainProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: MatrixRainProps = $derived.by(() => {
    const rawProps: MatrixRainProps = stripSvelteProps(allProps);
    const result = safeParse(MatrixRainPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as MatrixRainProps;
  });
</script>

<div data-slot="matrix-rain" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

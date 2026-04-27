<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const WindowPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for Window. */
  export type WindowProps = v.InferOutput<typeof WindowPropsSchema>;
</script>

<script lang="ts">
  /**
   * Window — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Window />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = WindowProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: WindowProps = $derived.by(() => {
    const rawProps: WindowProps = stripSvelteProps(allProps);
    const result = safeParse(WindowPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as WindowProps;
  });
</script>

<div data-slot="window" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>

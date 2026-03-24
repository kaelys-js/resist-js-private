<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const GestureHandlerPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type GestureHandlerProps = v.InferOutput<typeof GestureHandlerPropsSchema>;
</script>

<script lang="ts">
  /**
   * GestureHandler — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <GestureHandler />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = GestureHandlerProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: GestureHandlerProps = $derived.by(() => {
    const rawProps: GestureHandlerProps = stripSvelteProps(allProps);
    const result = safeParse(GestureHandlerPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as GestureHandlerProps;
  });
</script>

<div data-slot="gesture-handler" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
